import type {
  KnowledgeModel, AnyEntity, CollectionKey, SourceRef,
  RelationshipCategory, TransferPlanStatus,
} from './schema';
import { COLLECTION_KEYS } from './schema';
import { newId } from './model';

/**
 * Direct structured capture and owner-directed editing - the path that lets an
 * owner populate and correct the entity types the rule-based interview does not
 * create on its own (processes, relationships, decisions, judgments, history,
 * systems, commitments), and fix anything already captured.
 *
 * Provenance: a directly-entered entity is the owner asserting knowledge in
 * their own words, so its source kind is 'interview' (it came from the owner)
 * with detail "Entered directly by the owner", confidence 'high', and
 * verified=true - the owner IS the source of truth for their own business, so
 * these do not carry a "needs verification" marker.
 *
 * Every function is pure: it returns a new model and mutates nothing. Edits
 * bump updatedAt so nothing changes silently (rule 9). Nothing here deletes -
 * to retract, an owner edits the text or clears the verified flag.
 */

const NC = 'Not yet captured';
const s = (v: string | undefined): string => (v ?? '').trim();
const clean = (v: string | undefined): string => s(v) || NC;

function ownerSource(now: string): SourceRef[] {
  return [{ kind: 'interview', detail: 'Entered directly by the owner', capturedAt: now }];
}

function ownerBase(now: string) {
  return {
    confidence: 'high' as const,
    sources: ownerSource(now),
    createdAt: now,
    updatedAt: now,
    verified: true,
  };
}

const REL_CATEGORIES: RelationshipCategory[] = [
  'customer', 'vendor', 'banker', 'landlord', 'employee', 'advisor', 'other',
];
const TRANSFER_RISKS = ['high', 'medium', 'low'] as const;
const TRANSFER_STATUSES: TransferPlanStatus[] = [
  'not-started', 'planned', 'in-progress', 'transferred', 'will-not-transfer',
];

export interface RelationshipInput {
  who: string; category?: string; whyTheyMatter?: string; history?: string;
  whatTheyExpect?: string; transferRisk?: string; transferPlanStatus?: string;
}
export interface DecisionInput {
  name: string; howDecided?: string; realCriteria?: string[]; thresholds?: string[];
}
export interface ProcessInput {
  name: string; purpose?: string; frequency?: string; steps?: string[];
  dependencies?: string[]; failurePoints?: string[]; whoElseKnows?: string[];
}
export interface JudgmentInput { heuristic: string; context?: string }
export interface HistoryInput { whatHappened: string; when?: string; whatWasLearned?: string }
export interface SystemInput { name: string; kind?: string; whatItDoes?: string; accessHeldBy?: string; quirks?: string[] }
export interface CommitmentInput { withWhom: string; whatWasPromised?: string; direction?: string; writtenDown?: boolean }

const list = (v: string[] | undefined): string[] => (v ?? []).map((x) => x.trim()).filter(Boolean);

function withEntity(model: KnowledgeModel, key: CollectionKey, entity: AnyEntity): KnowledgeModel {
  const next: KnowledgeModel = JSON.parse(JSON.stringify(model));
  (next.entities[key] as AnyEntity[]).push(entity);
  next.updatedAt = entity.createdAt;
  return next;
}

/* ---- add ---------------------------------------------------------------- */

export function addRelationship(model: KnowledgeModel, input: RelationshipInput): KnowledgeModel {
  const now = new Date().toISOString();
  const category = (REL_CATEGORIES as string[]).includes(s(input.category))
    ? (input.category as RelationshipCategory) : 'other';
  const transferRisk = (TRANSFER_RISKS as readonly string[]).includes(s(input.transferRisk))
    ? (input.transferRisk as 'high' | 'medium' | 'low') : 'medium';
  const transferPlanStatus = (TRANSFER_STATUSES as string[]).includes(s(input.transferPlanStatus))
    ? (input.transferPlanStatus as TransferPlanStatus) : 'not-started';
  return withEntity(model, 'relationships', {
    id: newId('rel'), type: 'relationship', ...ownerBase(now),
    who: s(input.who), category,
    whyTheyMatter: clean(input.whyTheyMatter), history: clean(input.history),
    whatTheyExpect: clean(input.whatTheyExpect), transferRisk, transferPlanStatus,
  });
}

export function addDecision(model: KnowledgeModel, input: DecisionInput): KnowledgeModel {
  const now = new Date().toISOString();
  return withEntity(model, 'decisions', {
    id: newId('dec'), type: 'decision', ...ownerBase(now),
    name: s(input.name), howDecided: clean(input.howDecided),
    realCriteria: list(input.realCriteria), thresholds: list(input.thresholds), examples: [],
  });
}

export function addProcess(model: KnowledgeModel, input: ProcessInput): KnowledgeModel {
  const now = new Date().toISOString();
  return withEntity(model, 'processes', {
    id: newId('proc'), type: 'process', ...ownerBase(now),
    name: s(input.name), purpose: clean(input.purpose), frequency: clean(input.frequency),
    steps: list(input.steps).map((description, i) => ({ order: i + 1, description })),
    dependencies: list(input.dependencies), failurePoints: list(input.failurePoints),
    whoElseKnows: list(input.whoElseKnows),
  });
}

export function addJudgment(model: KnowledgeModel, input: JudgmentInput): KnowledgeModel {
  const now = new Date().toISOString();
  return withEntity(model, 'judgments', {
    id: newId('judg'), type: 'judgment', ...ownerBase(now),
    heuristic: s(input.heuristic), context: s(input.context) || undefined,
  });
}

export function addHistory(model: KnowledgeModel, input: HistoryInput): KnowledgeModel {
  const now = new Date().toISOString();
  return withEntity(model, 'history', {
    id: newId('hist'), type: 'history', ...ownerBase(now),
    whatHappened: s(input.whatHappened), when: clean(input.when), whatWasLearned: clean(input.whatWasLearned),
  });
}

export function addSystem(model: KnowledgeModel, input: SystemInput): KnowledgeModel {
  const now = new Date().toISOString();
  return withEntity(model, 'systems', {
    id: newId('sys'), type: 'system', ...ownerBase(now),
    name: s(input.name), kind: clean(input.kind), whatItDoes: clean(input.whatItDoes),
    accessHeldBy: clean(input.accessHeldBy), quirks: list(input.quirks),
  });
}

export function addCommitment(model: KnowledgeModel, input: CommitmentInput): KnowledgeModel {
  const now = new Date().toISOString();
  return withEntity(model, 'commitments', {
    id: newId('com'), type: 'commitment', ...ownerBase(now),
    withWhom: s(input.withWhom), whatWasPromised: clean(input.whatWasPromised),
    direction: clean(input.direction), writtenDown: Boolean(input.writtenDown),
  });
}

/* ---- edit --------------------------------------------------------------- */

function findEntity(model: KnowledgeModel, id: string): { key: CollectionKey; entity: AnyEntity } | null {
  for (const key of COLLECTION_KEYS) {
    const found = (model.entities[key] as AnyEntity[]).find((e) => e.id === id);
    if (found) return { key, entity: found };
  }
  return null;
}

/**
 * Owner-directed edit of an entity's own string/boolean fields. Never touches
 * id, type, sources, createdAt, or collection membership; always bumps
 * updatedAt so the change is attributable. Unknown keys and structural fields
 * are ignored.
 */
export function patchEntity(
  model: KnowledgeModel, id: string, patch: Record<string, string | boolean>,
): KnowledgeModel {
  const next: KnowledgeModel = JSON.parse(JSON.stringify(model));
  const hit = findEntity(next, id);
  if (!hit) throw new Error(`No such entity: ${id}`);
  const rec = hit.entity as unknown as Record<string, unknown>;
  const PROTECTED = new Set(['id', 'type', 'sources', 'createdAt', 'updatedAt']);
  let changed = false;
  for (const [k, v] of Object.entries(patch)) {
    if (PROTECTED.has(k) || !(k in rec)) continue;
    const cur = rec[k];
    if (typeof cur === 'string' && typeof v === 'string') {
      const val = v.trim();
      if (val && val !== cur) { rec[k] = val; changed = true; }
    } else if (typeof cur === 'boolean' && typeof v === 'boolean') {
      if (v !== cur) { rec[k] = v; changed = true; }
    }
  }
  if (changed) {
    const now = new Date().toISOString();
    rec.updatedAt = now;
    next.updatedAt = now;
  }
  return next;
}

/** Owner confirms (or un-confirms) an item. Attributable; nothing else moves. */
export function setVerified(model: KnowledgeModel, id: string, verified: boolean): KnowledgeModel {
  const next: KnowledgeModel = JSON.parse(JSON.stringify(model));
  const hit = findEntity(next, id);
  if (!hit) throw new Error(`No such entity: ${id}`);
  if (hit.entity.verified !== verified) {
    const now = new Date().toISOString();
    hit.entity.verified = verified;
    hit.entity.updatedAt = now;
    next.updatedAt = now;
  }
  return next;
}
