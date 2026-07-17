import type {
  KnowledgeModel, GapEntity, SourceRef,
  ProcessEntity, DecisionEntity, RelationshipEntity, RelationshipCategory,
  CommitmentEntity, SystemEntity, JudgmentEntity, HistoryEntity,
} from '../knowledge-model/schema';
import { newId } from '../knowledge-model/model';
import type { QA, ProjectInterviewMemory } from './engine';

/**
 * Assisted interviewing - the optional Anthropic-backed layer (DECISIONS.md
 * 2026-07-17; authorized 2026-07-10, archived as PR #3, revived by porting -
 * never by merging the stale branch).
 *
 * DESIGN CHANGE FROM THE ARCHIVED DRAFT, deliberate: this is an ENRICHMENT
 * LAYER, not an engine replacement. The deterministic RuleBasedEngine still
 * owns every piece of bookkeeping - which question is asked, coverage,
 * completion, and the verbatim Fact floor - and the screen SAVES that floor
 * before any network call is made. The model is consulted afterwards, and its
 * output is strictly additive:
 *
 * 1. STRUCTURED DRAFTS - proposed entities for all seven types the interview
 *    cannot create (processes, decisions, relationships, commitments, systems,
 *    judgments, history; the archived draft handled only the first three and
 *    omitted commitments - the highest-value output). Every draft is source
 *    'inferred', confidence 'low', verified=false, so deliverables render it
 *    "(needs verification) (low confidence)" and the owner's promotion path
 *    (setVerified) is the only way it becomes confirmed knowledge.
 *
 * 2. CLARIFICATION FLAGS - questions about what the answer left ambiguous or
 *    missing ("is anything owed in return?"). Each becomes an inferred
 *    GapEntity plus a queued follow-up thread, so the NEXT sitting opens by
 *    asking it. Capped at MAX_FLAGS_PER_ANSWER (the P4 noise lesson): a bad
 *    flag costs one unnecessary question, but a flood buries the dashboard.
 *
 * On ANY failure - no key, network down, API error, malformed output - the
 * caller keeps the already-saved floor and the owner's words are never at
 * risk. The API key is passed via a getter and lives in memory only; this
 * module never writes it anywhere (rule 11 / no stored credentials).
 */

export const ASSIST_MODEL = 'claude-haiku-4-5';
export const ANTHROPIC_VERSION = '2023-06-01';
export const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
export const MAX_FLAGS_PER_ANSWER = 3;

/* ------------------------------------------------------------------ */
/* Minimal API client - fetch only, no SDK (spec: no unnecessary deps) */

export interface LlmToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface LlmRequest {
  system?: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  maxTokens: number;
  /** When set, forces the model to answer only by calling this tool. */
  tool?: LlmToolDef;
}

export interface LlmResponse {
  text: string;
  /** Parsed input of the forced tool_use block, when a tool was requested. */
  toolInput?: unknown;
  stopReason: string;
}

/** Client seam: tests inject a fake; the app injects the real fetch. */
export interface LlmClient {
  complete(req: LlmRequest): Promise<LlmResponse>;
}

interface RawBlock { type: string; text?: string; input?: unknown }
interface RawResponse { content?: RawBlock[]; stop_reason?: string }

/**
 * Real client over the Anthropic Messages API. `getKey` returns the in-memory
 * key or null; a null key throws before any request is made.
 */
export function createAnthropicClient(
  getKey: () => string | null,
  doFetch: typeof fetch = fetch,
): LlmClient {
  return {
    async complete(req: LlmRequest): Promise<LlmResponse> {
      const key = getKey();
      if (!key) throw new Error('No API key is set for assisted interviewing.');

      const body: Record<string, unknown> = {
        model: ASSIST_MODEL,
        max_tokens: req.maxTokens,
        messages: req.messages,
      };
      if (req.system) body.system = req.system;
      if (req.tool) {
        body.tools = [{
          name: req.tool.name,
          description: req.tool.description,
          input_schema: req.tool.inputSchema,
        }];
        body.tool_choice = { type: 'tool', name: req.tool.name };
      }

      const resp = await doFetch(ANTHROPIC_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': key,
          'anthropic-version': ANTHROPIC_VERSION,
          // Required for direct browser (CORS) calls with a user-supplied key.
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        let detail = '';
        try { detail = await resp.text(); } catch { /* ignore */ }
        throw new Error(`Anthropic API error ${resp.status}: ${detail.slice(0, 300)}`);
      }

      const data = (await resp.json()) as RawResponse;
      let text = '';
      let toolInput: unknown;
      for (const block of data.content ?? []) {
        if (block.type === 'text' && block.text) text += block.text;
        if (block.type === 'tool_use') toolInput = block.input;
      }
      return { text, toolInput, stopReason: data.stop_reason ?? '' };
    },
  };
}

/* ------------------------------------------------------------------ */
/* The forced-tool extraction schema: seven entity types + flags       */

const REL_CATEGORIES: RelationshipCategory[] = [
  'customer', 'vendor', 'banker', 'landlord', 'employee', 'advisor', 'other',
];

const str = { type: 'string' } as const;
const obj = (properties: Record<string, unknown>, required: string[]) =>
  ({ type: 'object', additionalProperties: false, properties, required }) as const;
const arr = (items: unknown) => ({ type: 'array', items }) as const;

export const EXTRACT_TOOL: LlmToolDef = {
  name: 'record_structured_knowledge',
  description:
    'Record only structured knowledge that is explicitly present in the answer. ' +
    'Do not invent, infer beyond the words, or add anything the speaker did not say. ' +
    'Names, amounts, and terms must come from the answer itself. When unsure, leave it ' +
    'out. If the answer contains none of a category, return an empty array for it. ' +
    'Never record credentials, passwords, or account numbers anywhere - for systems, ' +
    'record only where access lives and who holds it. Separately, flag up to three ' +
    'points the answer left ambiguous or missing as short clarifying questions.',
  inputSchema: obj({
    processes: arr(obj({ name: str, purpose: str, frequency: str }, ['name'])),
    decisions: arr(obj({ name: str, howDecided: str }, ['name'])),
    relationships: arr(obj(
      { who: str, category: { type: 'string', enum: REL_CATEGORIES }, whyTheyMatter: str },
      ['who'],
    )),
    commitments: arr(obj(
      { withWhom: str, whatWasPromised: str, direction: str, writtenDown: { type: 'boolean' } },
      ['withWhom'],
    )),
    systems: arr(obj({ name: str, kind: str, whatItDoes: str, accessHeldBy: str }, ['name'])),
    judgments: arr(obj({ heuristic: str, context: str }, ['heuristic'])),
    history: arr(obj({ whatHappened: str, when: str, whatWasLearned: str }, ['whatHappened'])),
    clarifications: arr(obj({ question: str, why: str }, ['question'])),
  }, ['processes', 'decisions', 'relationships', 'commitments', 'systems',
    'judgments', 'history', 'clarifications']),
};

interface ExtractShape {
  processes?: { name?: string; purpose?: string; frequency?: string }[];
  decisions?: { name?: string; howDecided?: string }[];
  relationships?: { who?: string; category?: string; whyTheyMatter?: string }[];
  commitments?: { withWhom?: string; whatWasPromised?: string; direction?: string; writtenDown?: boolean }[];
  systems?: { name?: string; kind?: string; whatItDoes?: string; accessHeldBy?: string }[];
  judgments?: { heuristic?: string; context?: string }[];
  history?: { whatHappened?: string; when?: string; whatWasLearned?: string }[];
  clarifications?: { question?: string; why?: string }[];
}

const NC = 'Not yet captured';
const s = (v: string | undefined): string => (v ?? '').trim();
const nc = (v: string | undefined): string => s(v) || NC;

export interface EnrichResult {
  model: KnowledgeModel;
  memory: ProjectInterviewMemory;
  /** Structured drafts appended (all inferred/low/unverified). */
  drafts: number;
  /** Clarifying questions queued for the next sitting. */
  flags: number;
}

export class AssistedExtraction {
  private client: LlmClient;
  constructor(client: LlmClient) { this.client = client; }

  /**
   * Enrich an already-ingested answer. Pure with respect to its inputs:
   * returns new model/memory copies, mutates nothing, deletes nothing.
   * Throws on API failure - the caller keeps the saved floor.
   */
  async enrich(
    model: KnowledgeModel,
    memory: ProjectInterviewMemory,
    qa: QA,
  ): Promise<EnrichResult> {
    const trimmed = qa.answer.trim();
    if (!trimmed) return { model, memory, drafts: 0, flags: 0 };

    const res = await this.client.complete({
      maxTokens: 1024,
      tool: EXTRACT_TOOL,
      system:
        'You review one interview answer about how a business or job really runs. ' +
        'Extract ONLY structured knowledge the speaker stated explicitly - never ' +
        'invent or embellish; when unsure, leave it out. Then flag what the answer ' +
        'left ambiguous or missing as at most three short clarifying questions a ' +
        'warm interviewer would ask next time.',
      messages: [{
        role: 'user',
        content: `Interview question: "${qa.question}"\n\nAnswer:\n"""${trimmed}"""`,
      }],
    });

    const shape = (res.toolInput ?? {}) as ExtractShape;
    return this.apply(model, memory, qa, shape);
  }

  /** Append inferred, unverified drafts and queued flags. Never edits or deletes. */
  private apply(
    model: KnowledgeModel,
    memory: ProjectInterviewMemory,
    qa: QA,
    shape: ExtractShape,
  ): EnrichResult {
    const now = new Date().toISOString();
    const nextModel: KnowledgeModel = JSON.parse(JSON.stringify(model));
    const nextMemory: ProjectInterviewMemory = JSON.parse(JSON.stringify(memory));
    const source = (what: string): SourceRef[] => [{
      kind: 'inferred',
      detail: `Assisted ${what} from ${qa.trackId}:${qa.areaId} - verify against the owner`,
      capturedAt: now,
    }];
    const draftBase = () => ({
      confidence: 'low' as const, createdAt: now, updatedAt: now, verified: false,
    });
    let drafts = 0;

    for (const p of shape.processes ?? []) {
      const name = s(p.name);
      if (!name) continue;
      nextModel.entities.processes.push({
        id: newId('proc'), type: 'process', ...draftBase(), sources: source('structured extraction'),
        name, purpose: nc(p.purpose), frequency: nc(p.frequency),
        steps: [], dependencies: [], failurePoints: [], whoElseKnows: [],
      } satisfies ProcessEntity);
      drafts++;
    }

    for (const d of shape.decisions ?? []) {
      const name = s(d.name);
      if (!name) continue;
      nextModel.entities.decisions.push({
        id: newId('dec'), type: 'decision', ...draftBase(), sources: source('structured extraction'),
        name, howDecided: nc(d.howDecided), realCriteria: [], thresholds: [], examples: [],
      } satisfies DecisionEntity);
      drafts++;
    }

    for (const r of shape.relationships ?? []) {
      const who = s(r.who);
      if (!who) continue;
      const category = (REL_CATEGORIES as string[]).includes(r.category ?? '')
        ? (r.category as RelationshipCategory) : 'other';
      nextModel.entities.relationships.push({
        id: newId('rel'), type: 'relationship', ...draftBase(), sources: source('structured extraction'),
        who, category, whyTheyMatter: nc(r.whyTheyMatter),
        history: NC, whatTheyExpect: NC,
        transferRisk: 'medium', transferPlanStatus: 'not-started',
      } satisfies RelationshipEntity);
      drafts++;
    }

    for (const c of shape.commitments ?? []) {
      const withWhom = s(c.withWhom);
      if (!withWhom) continue;
      nextModel.entities.commitments.push({
        id: newId('com'), type: 'commitment', ...draftBase(), sources: source('structured extraction'),
        withWhom, whatWasPromised: nc(c.whatWasPromised), direction: nc(c.direction),
        writtenDown: c.writtenDown === true,
      } satisfies CommitmentEntity);
      drafts++;
    }

    for (const sys of shape.systems ?? []) {
      const name = s(sys.name);
      if (!name) continue;
      nextModel.entities.systems.push({
        id: newId('sys'), type: 'system', ...draftBase(), sources: source('structured extraction'),
        name, kind: nc(sys.kind), whatItDoes: nc(sys.whatItDoes),
        accessHeldBy: nc(sys.accessHeldBy), quirks: [],
      } satisfies SystemEntity);
      drafts++;
    }

    for (const j of shape.judgments ?? []) {
      const heuristic = s(j.heuristic);
      if (!heuristic) continue;
      nextModel.entities.judgments.push({
        id: newId('judg'), type: 'judgment', ...draftBase(), sources: source('structured extraction'),
        heuristic, context: s(j.context) || undefined,
      } satisfies JudgmentEntity);
      drafts++;
    }

    for (const h of shape.history ?? []) {
      const whatHappened = s(h.whatHappened);
      if (!whatHappened) continue;
      nextModel.entities.history.push({
        id: newId('hist'), type: 'history', ...draftBase(), sources: source('structured extraction'),
        whatHappened, when: nc(h.when), whatWasLearned: nc(h.whatWasLearned),
      } satisfies HistoryEntity);
      drafts++;
    }

    let flags = 0;
    for (const c of (shape.clarifications ?? []).slice(0, MAX_FLAGS_PER_ANSWER)) {
      const question = s(c.question);
      if (!question) continue;
      const gap: GapEntity = {
        id: newId('gap'), type: 'gap', confidence: 'low',
        sources: source('clarification flag'),
        createdAt: now, updatedAt: now, verified: false,
        question,
        raisedBecause: s(c.why) || 'Assisted review flagged a point needing clarification',
        status: 'queued',
        relatedIds: [],
      };
      nextModel.entities.gaps.push(gap);
      nextMemory.pendingThreads.push({
        trackId: qa.trackId, areaId: qa.areaId,
        question,
        reason: 'The last answer left this point open, and the record should carry it.',
      });
      flags++;
    }

    if (drafts + flags > 0) nextModel.updatedAt = now;
    return {
      model: drafts + flags > 0 ? nextModel : model,
      memory: flags > 0 ? nextMemory : memory,
      drafts, flags,
    };
  }
}
