import {
  COLLECTION_KEYS,
  type KnowledgeModel,
  type AnyEntity,
  type CollectionKey,
  type SourceRef,
} from './schema';

/**
 * Merge rules (see DECISIONS.md, Stage 1):
 * - Merge never deletes.
 * - New ids in `incoming` are added.
 * - On id collision: the entity with the newer updatedAt contributes its
 *   non-empty fields; empty/missing incoming fields never blank out
 *   existing data. Sources are unioned. verified stays true if either is.
 * - Every change is recorded in the MergeReport. Nothing is silent.
 */

export interface MergeChange {
  collection: CollectionKey;
  id: string;
  action: 'added' | 'updated' | 'unchanged';
  fieldsChanged: string[];
}

export interface MergeReport {
  changes: MergeChange[];
  added: number;
  updated: number;
  unchanged: number;
}

function sourceKey(s: SourceRef): string {
  return [s.kind, s.sessionId ?? '', s.documentId ?? '', s.detail ?? '', s.capturedAt].join('|');
}

function unionSources(a: SourceRef[], b: SourceRef[]): SourceRef[] {
  const out: SourceRef[] = [];
  const seen = new Set<string>();
  for (const s of [...a, ...b]) {
    const k = sourceKey(s);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(s);
    }
  }
  return out;
}

function isEmpty(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

function mergeEntity(existing: AnyEntity, incoming: AnyEntity): { merged: AnyEntity; fieldsChanged: string[] } {
  const newer = incoming.updatedAt >= existing.updatedAt ? incoming : existing;
  const older = newer === incoming ? existing : incoming;

  const merged: Record<string, unknown> = { ...(older as unknown as Record<string, unknown>) };
  const fieldsChanged: string[] = [];
  const newerRec = newer as unknown as Record<string, unknown>;

  for (const key of Object.keys(newerRec)) {
    // sources/verified/createdAt/updatedAt are housekeeping fields set
    // explicitly below; excluding them keeps fieldsChanged a record of
    // *content* changes, so a pure timestamp bump reads as 'unchanged'.
    if (key === 'sources' || key === 'verified' || key === 'createdAt' || key === 'updatedAt') continue;
    const candidate = newerRec[key];
    if (isEmpty(candidate)) continue;
    if (JSON.stringify(merged[key]) !== JSON.stringify(candidate)) {
      // Only count as a change if it differs from what `existing` had.
      const existingVal = (existing as unknown as Record<string, unknown>)[key];
      merged[key] = candidate;
      if (JSON.stringify(existingVal) !== JSON.stringify(candidate)) fieldsChanged.push(key);
    }
  }

  merged.sources = unionSources(existing.sources, incoming.sources);
  if (merged.sources !== existing.sources &&
      (merged.sources as SourceRef[]).length !== existing.sources.length) {
    fieldsChanged.push('sources');
  }
  merged.verified = existing.verified || incoming.verified;
  if (merged.verified !== existing.verified) fieldsChanged.push('verified');
  merged.createdAt = existing.createdAt <= incoming.createdAt ? existing.createdAt : incoming.createdAt;
  merged.updatedAt = existing.updatedAt >= incoming.updatedAt ? existing.updatedAt : incoming.updatedAt;

  return { merged: merged as unknown as AnyEntity, fieldsChanged };
}

/** Merge `incoming` into a copy of `base`. Returns the new model + full report. */
export function mergeModels(
  base: KnowledgeModel,
  incoming: KnowledgeModel,
): { model: KnowledgeModel; report: MergeReport } {
  const model: KnowledgeModel = JSON.parse(JSON.stringify(base));
  const changes: MergeChange[] = [];

  for (const key of COLLECTION_KEYS) {
    const baseList = model.entities[key] as AnyEntity[];
    const byId = new Map(baseList.map((e) => [e.id, e]));
    for (const inc of incoming.entities[key] as AnyEntity[]) {
      const existing = byId.get(inc.id);
      if (!existing) {
        baseList.push(JSON.parse(JSON.stringify(inc)));
        byId.set(inc.id, inc);
        changes.push({ collection: key, id: inc.id, action: 'added', fieldsChanged: [] });
      } else {
        const { merged, fieldsChanged } = mergeEntity(existing, inc);
        const idx = baseList.findIndex((e) => e.id === inc.id);
        baseList[idx] = merged;
        changes.push({
          collection: key,
          id: inc.id,
          action: fieldsChanged.length > 0 ? 'updated' : 'unchanged',
          fieldsChanged,
        });
      }
    }
  }

  model.updatedAt =
    base.updatedAt >= incoming.updatedAt ? base.updatedAt : incoming.updatedAt;

  const report: MergeReport = {
    changes,
    added: changes.filter((c) => c.action === 'added').length,
    updated: changes.filter((c) => c.action === 'updated').length,
    unchanged: changes.filter((c) => c.action === 'unchanged').length,
  };
  return { model, report };
}

/**
 * Dedupe detection: finds entities within one model that look like the same
 * real-world item under different ids. Reports candidates only - it never
 * auto-merges, because collapsing two distinct captured items without the
 * owner's confirmation would violate knowledge integrity.
 */
export interface DuplicateCandidate {
  collection: CollectionKey;
  ids: string[];
  reason: string;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

function naturalKey(e: AnyEntity): string | null {
  switch (e.type) {
    case 'fact':        return norm(e.statement);
    case 'process':     return norm(e.name);
    case 'relationship':return `${e.category}:${norm(e.who)}`;
    case 'decision':    return norm(e.name);
    case 'judgment':    return norm(e.heuristic);
    case 'history':     return norm(e.whatHappened);
    case 'system':      return norm(e.name);
    case 'commitment':  return `${norm(e.withWhom)}:${norm(e.whatWasPromised)}`;
    case 'risk':        return norm(e.description);
    case 'gap':         return norm(e.question);
    default:            return null;
  }
}

export function findDuplicates(model: KnowledgeModel): DuplicateCandidate[] {
  const out: DuplicateCandidate[] = [];
  for (const key of COLLECTION_KEYS) {
    const groups = new Map<string, string[]>();
    for (const e of model.entities[key] as AnyEntity[]) {
      const k = naturalKey(e);
      if (!k) continue;
      const g = groups.get(k) ?? [];
      g.push(e.id);
      groups.set(k, g);
    }
    for (const [k, ids] of groups) {
      if (ids.length > 1) {
        out.push({ collection: key, ids, reason: `matching natural key: "${k}"` });
      }
    }
  }
  return out;
}
