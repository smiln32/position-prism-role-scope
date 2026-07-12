import { describe, it, expect } from 'vitest';
import {
  createEmptyModel,
  validateModel,
  exportModel,
  importModel,
  entityCount,
} from './model';
import { mergeModels, findDuplicates } from './merge';
import { fixtureModel } from './fixture';
import type { KnowledgeModel, FactEntity } from './schema';

const profile = { businessName: 'Test Co (fixture)', ownerName: 'Test Owner (fixture)' };

describe('model creation and validation', () => {
  it('creates a valid empty model', () => {
    const m = createEmptyModel('p1', profile);
    expect(validateModel(m)).toEqual([]);
    expect(entityCount(m)).toBe(0);
  });

  it('fixture model is valid', () => {
    expect(validateModel(fixtureModel)).toEqual([]);
    expect(entityCount(fixtureModel)).toBe(12);
  });

  it('rejects wrong schema version', () => {
    const m = { ...createEmptyModel('p1', profile), schemaVersion: '0.9.0' };
    expect(validateModel(m).some((e) => e.path === '$.schemaVersion')).toBe(true);
  });

  it('rejects entity without a source', () => {
    const m = createEmptyModel('p1', profile);
    m.entities.facts.push({
      id: 'fact_x', type: 'fact', confidence: 'high', sources: [],
      createdAt: 't', updatedAt: 't', verified: false, statement: 's',
    });
    expect(validateModel(m).some((e) => e.message.includes('at least one source'))).toBe(true);
  });

  it('rejects duplicate ids across collections', () => {
    const m: KnowledgeModel = JSON.parse(JSON.stringify(fixtureModel));
    m.entities.facts.push({ ...m.entities.facts[0] });
    expect(validateModel(m).some((e) => e.message.includes('duplicate id'))).toBe(true);
  });

  it('rejects entity in the wrong collection', () => {
    const m: KnowledgeModel = JSON.parse(JSON.stringify(fixtureModel));
    (m.entities.facts as unknown[]).push({ ...m.entities.risks[0] });
    expect(validateModel(m).some((e) => e.message.includes('does not belong'))).toBe(true);
  });
});

describe('export / import round-trip', () => {
  it('empty model round-trips losslessly', () => {
    const m = createEmptyModel('p1', profile);
    expect(importModel(exportModel(m))).toEqual(m);
  });

  it('fixture model round-trips losslessly', () => {
    expect(importModel(exportModel(fixtureModel))).toEqual(fixtureModel);
  });

  it('import rejects invalid JSON', () => {
    expect(() => importModel('{not json')).toThrow('not valid JSON');
  });

  it('import rejects a structurally invalid model', () => {
    expect(() => importModel('{"schemaVersion":"1.0.0"}')).toThrow('failed validation');
  });
});

describe('merge', () => {
  it('adds new entities and reports them', () => {
    const base = createEmptyModel('p1', profile);
    const { model, report } = mergeModels(base, fixtureModel);
    expect(entityCount(model)).toBe(entityCount(fixtureModel));
    expect(report.added).toBe(12);
    expect(report.updated).toBe(0);
    expect(validateModel(model)).toEqual([]);
  });

  it('never deletes: base-only entities survive', () => {
    const incoming = createEmptyModel('p1', profile);
    const { model } = mergeModels(fixtureModel, incoming);
    expect(entityCount(model)).toBe(entityCount(fixtureModel));
  });

  it('newer non-empty fields win; empty incoming fields never blank data', () => {
    const base: KnowledgeModel = JSON.parse(JSON.stringify(fixtureModel));
    const incoming: KnowledgeModel = JSON.parse(JSON.stringify(fixtureModel));
    const inc = incoming.entities.facts[0] as FactEntity;
    inc.statement = 'Ray opens the shop at 6:30am; on Fridays Denise opens instead.';
    inc.topic = '';
    inc.updatedAt = '2026-07-11T12:00:00.000Z';

    const { model, report } = mergeModels(base, incoming);
    const merged = model.entities.facts[0] as FactEntity;
    expect(merged.statement).toContain('Denise opens instead');
    expect(merged.topic).toBe('daily routine'); // not blanked
    const change = report.changes.find((c) => c.id === 'fact_0001');
    expect(change?.action).toBe('updated');
    expect(change?.fieldsChanged).toContain('statement');
  });

  it('older incoming updates do not overwrite newer base data', () => {
    const base: KnowledgeModel = JSON.parse(JSON.stringify(fixtureModel));
    base.entities.facts[0].updatedAt = '2026-07-12T12:00:00.000Z';
    (base.entities.facts[0] as FactEntity).statement = 'NEWER BASE STATEMENT';
    const incoming: KnowledgeModel = JSON.parse(JSON.stringify(fixtureModel));
    (incoming.entities.facts[0] as FactEntity).statement = 'older incoming statement';

    const { model } = mergeModels(base, incoming);
    expect((model.entities.facts[0] as FactEntity).statement).toBe('NEWER BASE STATEMENT');
  });

  it('unions sources without duplicates and preserves verified=true', () => {
    const base: KnowledgeModel = JSON.parse(JSON.stringify(fixtureModel));
    const incoming: KnowledgeModel = JSON.parse(JSON.stringify(fixtureModel));
    incoming.entities.facts[0].sources.push({
      kind: 'document', documentId: 'doc-x', detail: 'page 2', capturedAt: '2026-07-11T00:00:00.000Z',
    });
    incoming.entities.facts[0].verified = false;

    const { model } = mergeModels(base, incoming);
    const merged = model.entities.facts[0];
    expect(merged.sources.length).toBe(2);
    expect(merged.verified).toBe(true);
  });

  it('merging a model with itself reports everything unchanged', () => {
    const { report } = mergeModels(fixtureModel, JSON.parse(JSON.stringify(fixtureModel)));
    expect(report.added).toBe(0);
    expect(report.updated).toBe(0);
    expect(report.unchanged).toBe(12);
  });

  it('a newer timestamp with identical content reports unchanged', () => {
    const base: KnowledgeModel = JSON.parse(JSON.stringify(fixtureModel));
    const incoming: KnowledgeModel = JSON.parse(JSON.stringify(fixtureModel));
    incoming.entities.facts[0].updatedAt = '2026-07-12T12:00:00.000Z';

    const { model, report } = mergeModels(base, incoming);
    const change = report.changes.find((c) => c.id === 'fact_0001');
    expect(change?.action).toBe('unchanged');
    expect(change?.fieldsChanged).toEqual([]);
    // the newer timestamp still wins on the merged entity itself
    expect(model.entities.facts[0].updatedAt).toBe('2026-07-12T12:00:00.000Z');
  });
});

describe('dedupe detection', () => {
  it('clean fixture has no duplicate candidates', () => {
    expect(findDuplicates(fixtureModel)).toEqual([]);
  });

  it('detects same relationship under two ids, reports without merging', () => {
    const m: KnowledgeModel = JSON.parse(JSON.stringify(fixtureModel));
    m.entities.relationships.push({
      ...m.entities.relationships[0],
      id: 'rel_dupe',
      who: 'TOM VASQUEZ, Apex Aerospace purchasing',
    });
    const dupes = findDuplicates(m);
    expect(dupes.length).toBe(1);
    expect(dupes[0].ids).toEqual(['rel_0001', 'rel_dupe']);
    expect(m.entities.relationships.length).toBe(3); // untouched
  });
});
