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
 * bump updatedAt so nothing changes silently (rule 9). No entity is ever
 * deleted; the only removal is owner-directed, item-level correction of a
 * list field the owner themselves populated (removeListItem) - an explicit,
 * attributable edit, not a silent drop.
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

/* ---- list-field edit ---------------------------------------------------- */

/**
 * The array fields an owner can edit item-by-item. `steps` holds ProcessStep
 * objects ({order, description}); the rest are plain string[]. Both are edited
 * as ordered plain strings and mapped back on write - steps get renumbered.
 */
export type ListField =
  | 'steps' | 'dependencies' | 'failurePoints' | 'whoElseKnows'
  | 'realCriteria' | 'thresholds' | 'quirks';

const STRING_LIST_FIELDS = new Set<string>([
  'dependencies', 'failurePoints', 'whoElseKnows', 'realCriteria', 'thresholds', 'quirks',
]);
const STEP_LIST_FIELD = 'steps';

function isListField(field: string): field is ListField {
  return field === STEP_LIST_FIELD || STRING_LIST_FIELDS.has(field);
}

/** Read a list field as plain strings (steps -> their descriptions). */
function readList(rec: Record<string, unknown>, field: ListField): string[] {
  const raw = rec[field];
  if (!Array.isArray(raw)) return [];
  if (field === STEP_LIST_FIELD) return (raw as { description: string }[]).map((x) => x.description);
  return (raw as string[]).slice();
}

/** Write plain strings back into a list field (steps get renumbered 1..n). */
function writeList(rec: Record<string, unknown>, field: ListField, values: string[]): void {
  rec[field] = field === STEP_LIST_FIELD
    ? values.map((description, i) => ({ order: i + 1, description }))
    : values.slice();
}

/** The current items of an editable list field, as plain strings (for the UI). */
export function listFieldValues(entity: AnyEntity, field: string): string[] {
  if (!isListField(field)) return [];
  return readList(entity as unknown as Record<string, unknown>, field);
}

/**
 * Apply an owner-directed transform to an entity's list field. Items are
 * trimmed and blanks dropped; a no-op transform returns the input model
 * unchanged. Any real change bumps updatedAt so it is attributable (rule 9) -
 * item removal is the owner correcting their own record, never a silent drop.
 */
function commitList(
  model: KnowledgeModel, id: string, field: string,
  transform: (items: string[]) => string[],
): KnowledgeModel {
  if (!isListField(field)) throw new Error(`Not an editable list field: ${field}`);
  const next: KnowledgeModel = JSON.parse(JSON.stringify(model));
  const hit = findEntity(next, id);
  if (!hit) throw new Error(`No such entity: ${id}`);
  const rec = hit.entity as unknown as Record<string, unknown>;
  if (!Array.isArray(rec[field]))
    throw new Error(`Entity ${id} has no list field "${field}".`);
  const before = readList(rec, field);
  const after = transform(before).map((x) => x.trim()).filter(Boolean);
  if (JSON.stringify(after) === JSON.stringify(before)) return model; // unchanged
  writeList(rec, field, after);
  const now = new Date().toISOString();
  hit.entity.updatedAt = now;
  next.updatedAt = now;
  return next;
}

/** Append an item to a list field. Blank input is ignored. */
export function addListItem(model: KnowledgeModel, id: string, field: string, text: string): KnowledgeModel {
  if (!text.trim()) return model;
  return commitList(model, id, field, (items) => [...items, text]);
}

/** Replace the item at `index`. A blank edit is ignored - use removeListItem to remove. */
export function editListItem(model: KnowledgeModel, id: string, field: string, index: number, text: string): KnowledgeModel {
  if (!text.trim()) return model;
  return commitList(model, id, field, (items) => {
    if (index < 0 || index >= items.length) return items;
    const copy = items.slice();
    copy[index] = text;
    return copy;
  });
}

/** Owner-directed removal of the item at `index` (attributable; steps renumber). */
export function removeListItem(model: KnowledgeModel, id: string, field: string, index: number): KnowledgeModel {
  return commitList(model, id, field, (items) => {
    if (index < 0 || index >= items.length) return items;
    const copy = items.slice();
    copy.splice(index, 1);
    return copy;
  });
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
