import {
  SCHEMA_VERSION,
  COLLECTION_KEYS,
  type KnowledgeModel,
  type ProjectProfile,
  type AnyEntity,
  type CollectionKey,
} from './schema';

const nowIso = () => new Date().toISOString();

export function newId(prefix: string): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}_${rand}`;
}

/** Create an empty model. */
export function createEmptyModel(
  projectId: string,
  profile: ProjectProfile,
): KnowledgeModel {
  const ts = nowIso();
  return {
    schemaVersion: SCHEMA_VERSION,
    projectId,
    subjectRole: 'owner',
    profile,
    createdAt: ts,
    updatedAt: ts,
    entities: {
      facts: [],
      processes: [],
      relationships: [],
      decisions: [],
      judgments: [],
      history: [],
      systems: [],
      commitments: [],
      risks: [],
      gaps: [],
    },
  };
}

export interface ValidationError {
  path: string;
  message: string;
}

const CONFIDENCE = new Set(['high', 'medium', 'low']);
const SOURCE_KINDS = new Set(['interview', 'document', 'inferred']);

const TYPE_FOR_COLLECTION: Record<CollectionKey, string> = {
  facts: 'fact',
  processes: 'process',
  relationships: 'relationship',
  decisions: 'decision',
  judgments: 'judgment',
  history: 'history',
  systems: 'system',
  commitments: 'commitment',
  risks: 'risk',
  gaps: 'gap',
};

function validateEntityBase(
  e: Partial<AnyEntity>,
  path: string,
  errors: ValidationError[],
): void {
  if (!e.id) errors.push({ path, message: 'missing id' });
  if (!e.confidence || !CONFIDENCE.has(e.confidence))
    errors.push({ path, message: `invalid confidence: ${String(e.confidence)}` });
  if (!Array.isArray(e.sources) || e.sources.length === 0)
    errors.push({ path, message: 'entity must have at least one source' });
  else
    e.sources.forEach((s, i) => {
      if (!SOURCE_KINDS.has(s.kind))
        errors.push({ path: `${path}.sources[${i}]`, message: `invalid source kind: ${String(s.kind)}` });
      if (!s.capturedAt)
        errors.push({ path: `${path}.sources[${i}]`, message: 'missing capturedAt' });
    });
  if (!e.createdAt) errors.push({ path, message: 'missing createdAt' });
  if (!e.updatedAt) errors.push({ path, message: 'missing updatedAt' });
  if (typeof e.verified !== 'boolean')
    errors.push({ path, message: 'missing verified flag' });
}

/** Structural validation of a full model. Returns [] when valid. */
export function validateModel(model: unknown): ValidationError[] {
  const errors: ValidationError[] = [];
  if (typeof model !== 'object' || model === null) {
    return [{ path: '$', message: 'model is not an object' }];
  }
  const m = model as Partial<KnowledgeModel>;

  if (m.schemaVersion !== SCHEMA_VERSION)
    errors.push({
      path: '$.schemaVersion',
      message: `expected ${SCHEMA_VERSION}, got ${String(m.schemaVersion)}`,
    });
  if (!m.projectId) errors.push({ path: '$.projectId', message: 'missing projectId' });
  if (!m.subjectRole) errors.push({ path: '$.subjectRole', message: 'missing subjectRole' });
  if (!m.profile || !m.profile.businessName || !m.profile.ownerName)
    errors.push({ path: '$.profile', message: 'profile requires businessName and ownerName' });
  if (!m.entities) {
    errors.push({ path: '$.entities', message: 'missing entities' });
    return errors;
  }

  const seenIds = new Set<string>();
  for (const key of COLLECTION_KEYS) {
    const list = m.entities[key];
    if (!Array.isArray(list)) {
      errors.push({ path: `$.entities.${key}`, message: 'missing collection' });
      continue;
    }
    list.forEach((e, i) => {
      const path = `$.entities.${key}[${i}]`;
      validateEntityBase(e, path, errors);
      if (e.type !== TYPE_FOR_COLLECTION[key])
        errors.push({ path, message: `type "${String(e.type)}" does not belong in ${key}` });
      if (e.id) {
        if (seenIds.has(e.id))
          errors.push({ path, message: `duplicate id: ${e.id}` });
        seenIds.add(e.id);
      }
    });
  }
  return errors;
}

/** Serialize a model to stable, human-diffable JSON. */
export function exportModel(model: KnowledgeModel): string {
  return JSON.stringify(model, null, 2);
}

/** Parse and validate JSON. Throws with all validation errors on failure. */
export function importModel(json: string): KnowledgeModel {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Import failed: not valid JSON.');
  }
  const errors = validateModel(parsed);
  if (errors.length > 0) {
    const summary = errors.map((e) => `${e.path}: ${e.message}`).join('; ');
    throw new Error(`Import failed validation: ${summary}`);
  }
  return parsed as KnowledgeModel;
}

/** Count of entities across all collections. */
export function entityCount(model: KnowledgeModel): number {
  return COLLECTION_KEYS.reduce((n, k) => n + model.entities[k].length, 0);
}
