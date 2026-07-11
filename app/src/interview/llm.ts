import type {
  KnowledgeModel, ProcessEntity, DecisionEntity, RelationshipEntity,
  RelationshipCategory, SourceRef,
} from '../knowledge-model/schema';
import { newId } from '../knowledge-model/model';
import {
  RuleBasedEngine, trackById,
  type InterviewEngine, type ProjectInterviewMemory,
  type NextQuestion, type IngestResult, type QA,
} from './engine';

/**
 * Optional Anthropic-backed interview engine - authorized in HANDOFF.md and
 * logged in DECISIONS.md. Two design commitments keep it inside the product's
 * knowledge-integrity rules:
 *
 * 1. It never controls the knowledge model's structure or bookkeeping. The
 *    deterministic RuleBasedEngine still chooses which area comes next and
 *    still writes the owner's answer verbatim as a high-confidence Fact, plus
 *    the same name-gaps and single-person risks. That "floor" is produced
 *    first and returned unchanged if the model call fails or no key is set.
 * 2. The model is used for exactly two things on top of that floor: rewording
 *    the next question warmly (never changing which area is asked), and
 *    proposing structured entities (processes, decisions, relationships).
 *    Every proposed entity is marked source 'inferred', confidence 'low', and
 *    verified=false, so deliverables render it "(needs verification) (low
 *    confidence)" - it can never masquerade as the owner's own words, and the
 *    verbatim Fact is always kept alongside it.
 *
 * The API key is passed in via a getter and is expected to live in memory
 * only (React state). This module never writes it anywhere. Credentials are
 * never stored - CLAUDE.md rule 11.
 */

export const HAIKU_MODEL = 'claude-haiku-4-5';
export const ANTHROPIC_VERSION = '2023-06-01';
export const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

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

/** Minimal client seam so tests inject a fake and the app injects fetch. */
export interface LlmClient {
  complete(req: LlmRequest): Promise<LlmResponse>;
}

interface RawBlock { type: string; text?: string; input?: unknown }
interface RawResponse { content?: RawBlock[]; stop_reason?: string }

/**
 * Real client over the Anthropic Messages API using fetch (no SDK, per the
 * spec's "no unnecessary dependencies"). `getKey` returns the in-memory key
 * or null; a null key throws before any request is made.
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
        model: HAIKU_MODEL,
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
/* Structured-extraction shapes the model returns via a forced tool.  */

const REL_CATEGORIES: RelationshipCategory[] = [
  'customer', 'vendor', 'banker', 'landlord', 'employee', 'advisor', 'other',
];

const EXTRACT_TOOL: LlmToolDef = {
  name: 'record_structured_knowledge',
  description:
    'Record only structured knowledge that is explicitly present in the owner\'s answer. ' +
    'Do not invent, infer beyond the words, or add anything the owner did not say. ' +
    'If the answer contains no clear process, decision, or relationship, return empty arrays.',
  inputSchema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      processes: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            name: { type: 'string' },
            purpose: { type: 'string' },
            frequency: { type: 'string' },
          },
          required: ['name'],
        },
      },
      decisions: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            name: { type: 'string' },
            howDecided: { type: 'string' },
          },
          required: ['name'],
        },
      },
      relationships: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            who: { type: 'string' },
            category: { type: 'string', enum: REL_CATEGORIES },
            whyTheyMatter: { type: 'string' },
          },
          required: ['who'],
        },
      },
    },
    required: ['processes', 'decisions', 'relationships'],
  },
};

interface ExtractShape {
  processes?: { name?: string; purpose?: string; frequency?: string }[];
  decisions?: { name?: string; howDecided?: string }[];
  relationships?: { who?: string; category?: string; whyTheyMatter?: string }[];
}

const NOT_CAPTURED = 'Not yet captured';

export class LlmInterviewEngine implements InterviewEngine {
  private rules = new RuleBasedEngine();
  private client: LlmClient;

  constructor(client: LlmClient) { this.client = client; }

  createMemory(): ProjectInterviewMemory { return this.rules.createMemory(); }
  coverage(memory: ProjectInterviewMemory, trackId: string) { return this.rules.coverage(memory, trackId); }
  allComplete(memory: ProjectInterviewMemory): boolean { return this.rules.allComplete(memory); }
  revisitQuestion(trackId: string, areaId: string): string { return this.rules.revisitQuestion(trackId, areaId); }

  /**
   * The rules decide WHICH area/thread is asked (coverage stays deterministic);
   * the model only rewords that same question warmly. On any failure the
   * rule-based question text is used unchanged.
   */
  async nextQuestion(memory: ProjectInterviewMemory, trackId: string): Promise<NextQuestion> {
    const base = this.rules.nextQuestion(memory, trackId);
    if (base.areaId === 'done') return base;
    try {
      const track = trackById(base.trackId);
      const res = await this.client.complete({
        maxTokens: 300,
        system:
          'You are a warm, experienced exit-planning advisor interviewing a business owner. ' +
          'Reword the given question so it feels personal and unhurried, keeping the exact same ' +
          'meaning and asking about the exact same thing. One question only. No preamble, no ' +
          'lists, under 40 words. Return only the question.',
        messages: [{
          role: 'user',
          content: `Part of the interview: "${track.title}".\nQuestion to reword: "${base.question}"`,
        }],
      });
      const reworded = res.text.trim().replace(/^["']|["']$/g, '').trim();
      return reworded ? { ...base, question: reworded } : base;
    } catch {
      return base;
    }
  }

  /**
   * Deterministic floor first (verbatim Fact + gaps + risks + coverage), then
   * clearly-labeled inferred structured entities on top. Any failure returns
   * the untouched floor - the owner's words are never at risk.
   */
  async ingestAnswer(
    memory: ProjectInterviewMemory,
    model: KnowledgeModel,
    sessionId: string,
    trackId: string,
    answer: string,
    revisitAreaId?: string,
  ): Promise<IngestResult> {
    const floor = this.rules.ingestAnswer(memory, model, sessionId, trackId, answer, revisitAreaId);
    const trimmed = answer.trim();
    if (!trimmed) return floor;

    try {
      const res = await this.client.complete({
        maxTokens: 1024,
        tool: EXTRACT_TOOL,
        system:
          'Extract ONLY structured knowledge the owner stated explicitly. Never invent or ' +
          'embellish. Names of processes, decisions, and relationships must come from the ' +
          'owner\'s own answer. When unsure, leave it out.',
        messages: [{ role: 'user', content: `Owner's answer:\n"""${trimmed}"""` }],
      });
      const shape = (res.toolInput ?? {}) as ExtractShape;
      const { model: enriched, added } = this.applyExtraction(floor.model, floor.qa, shape);
      if (added === 0) return floor;
      return { ...floor, model: enriched };
    } catch {
      return floor;
    }
  }

  /** Append inferred, unverified entities. Never edits or deletes anything. */
  private applyExtraction(
    model: KnowledgeModel,
    qa: QA,
    shape: ExtractShape,
  ): { model: KnowledgeModel; added: number } {
    const now = new Date().toISOString();
    const next: KnowledgeModel = JSON.parse(JSON.stringify(model));
    const source = (detail: string): SourceRef[] => [{
      kind: 'inferred',
      detail: `Assisted structured extraction from ${qa.trackId}:${qa.areaId} - ${detail}`,
      capturedAt: now,
    }];
    let added = 0;

    for (const p of shape.processes ?? []) {
      const name = (p.name ?? '').trim();
      if (!name) continue;
      next.entities.processes.push({
        id: newId('proc'), type: 'process', confidence: 'low',
        sources: source('verify against the owner'), createdAt: now, updatedAt: now, verified: false,
        name, purpose: (p.purpose ?? '').trim() || NOT_CAPTURED,
        frequency: (p.frequency ?? '').trim() || NOT_CAPTURED,
        steps: [], dependencies: [], failurePoints: [], whoElseKnows: [],
      } satisfies ProcessEntity);
      added++;
    }

    for (const d of shape.decisions ?? []) {
      const name = (d.name ?? '').trim();
      if (!name) continue;
      next.entities.decisions.push({
        id: newId('dec'), type: 'decision', confidence: 'low',
        sources: source('verify against the owner'), createdAt: now, updatedAt: now, verified: false,
        name, howDecided: (d.howDecided ?? '').trim() || NOT_CAPTURED,
        realCriteria: [], thresholds: [], examples: [],
      } satisfies DecisionEntity);
      added++;
    }

    for (const r of shape.relationships ?? []) {
      const who = (r.who ?? '').trim();
      if (!who) continue;
      const category = (REL_CATEGORIES as string[]).includes(r.category ?? '')
        ? (r.category as RelationshipCategory) : 'other';
      next.entities.relationships.push({
        id: newId('rel'), type: 'relationship', confidence: 'low',
        sources: source('verify against the owner'), createdAt: now, updatedAt: now, verified: false,
        who, category, whyTheyMatter: (r.whyTheyMatter ?? '').trim() || NOT_CAPTURED,
        history: NOT_CAPTURED, whatTheyExpect: NOT_CAPTURED,
        transferRisk: 'medium', transferPlanStatus: 'not-started',
      } satisfies RelationshipEntity);
      added++;
    }

    if (added > 0) next.updatedAt = now;
    return { model: next, added };
  }
}
