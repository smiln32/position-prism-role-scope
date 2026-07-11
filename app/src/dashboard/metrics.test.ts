import { describe, it, expect } from 'vitest';
import { scoreRisk, computeMetrics, resolveGap, STALE_DAYS } from './metrics';
import { fixtureModel } from '../knowledge-model/fixture';
import {
  createEmptyModel, exportModel, importModel, validateModel,
} from '../knowledge-model/model';
import { COLLECTION_KEYS, type RiskEntity } from '../knowledge-model/schema';
import { RuleBasedEngine, TRACKS } from '../interview/engine';
import { PROJECT_FORMAT_VERSION, type ProjectFile } from '../project/store';

/**
 * Stage 7 acceptance: dashboard numbers reconcile EXACTLY with model
 * contents (independent recount from raw JSON); export validates against
 * the frozen schema. Fixture data.
 */

function fixtureProject(): ProjectFile {
  const engine = new RuleBasedEngine();
  let memory = engine.createMemory();
  let model = JSON.parse(JSON.stringify(fixtureModel));
  let r = engine.ingestAnswer(memory, model, 's1', 'track-1',
    'I get in early, walk the floor, and check every machine that ran overnight before the crew arrives.');
  memory = r.memory; model = r.model;
  r = engine.ingestAnswer(memory, model, 's1', 'track-7',
    'Only I know the pricing history on the aerospace side and that worries me.');
  memory = r.memory; model = r.model;
  return { formatVersion: PROJECT_FORMAT_VERSION, model, sessions: [], interviewMemory: memory };
}

describe('Stage 7: risk scoring', () => {
  const base: RiskEntity = {
    id: 'r1', type: 'risk', confidence: 'medium',
    sources: [{ kind: 'inferred', detail: 'x', capturedAt: '2026-07-10T00:00:00.000Z' }],
    createdAt: '2026-07-10T00:00:00.000Z', updatedAt: '2026-07-10T00:00:00.000Z',
    verified: false, description: 'd', impact: 'i', riskKind: 'relationship',
  };

  it('is deterministic and matches the published formula', () => {
    // relationship, no mitigation, unverified, medium: 40+20+10 = 70 (high)
    expect(scoreRisk(base)).toMatchObject({ score: 70, band: 'high' });
    // single point of failure adds 25: 40+25+20+10 = 95
    expect(scoreRisk({ ...base, riskKind: 'single point of failure' }).score).toBe(95);
    // mitigation on record removes 20: 40+25+10 = 75
    expect(scoreRisk({ ...base, riskKind: 'single point of failure', mitigation: 'plan exists' }).score).toBe(75);
    // verified removes 10: 40+25+20 = 85
    expect(scoreRisk({ ...base, riskKind: 'single point of failure', verified: true }).score).toBe(85);
    // confidence shifts: high +5 -> 100 cap check (40+25+20+10+5 = 100)
    expect(scoreRisk({ ...base, riskKind: 'single point of failure', confidence: 'high' }).score).toBe(100);
    // low confidence -5, plain kind, mitigated, verified: 40-5 = 35 (low band)
    expect(scoreRisk({ ...base, confidence: 'low', verified: true, mitigation: 'm' }))
      .toMatchObject({ score: 35, band: 'low' });
    // reasons explain every point:
    expect(scoreRisk(base).reasons).toContain('no mitigation on record +20');
  });
});

describe('Stage 7 acceptance: dashboard reconciliation', () => {
  it('every dashboard number matches an independent recount of the raw model', () => {
    const project = fixtureProject();
    const now = new Date('2026-07-10T12:00:00.000Z');
    const m = computeMetrics(project, now);

    // Independent recount, straight from raw JSON - no shared code paths.
    const raw = JSON.parse(JSON.stringify(project.model));
    const rawEntities = COLLECTION_KEYS.flatMap((k: string) => raw.entities[k]);

    // Completeness
    let covered = 0, total = 0;
    for (const t of TRACKS) {
      covered += project.interviewMemory!.trackProgress[t.id]?.answeredAreas.length ?? 0;
      total += t.areas.length;
    }
    expect(m.completeness.coveredAreas).toBe(covered);
    expect(m.completeness.totalAreas).toBe(total);
    expect(total).toBe(50); // 8 + 6*7 areas across the eight tracks
    expect(m.completeness.percent).toBe(Math.round((covered / total) * 100));

    // Risks
    expect(m.risks.count).toBe(raw.entities.risks.length);
    expect(m.risks.byBand.high + m.risks.byBand.medium + m.risks.byBand.low).toBe(m.risks.count);

    // Gaps
    const statuses = raw.entities.gaps.map((g: { status: string }) => g.status);
    expect(m.gaps.open).toBe(statuses.filter((s: string) => s === 'open').length);
    expect(m.gaps.queued).toBe(statuses.filter((s: string) => s === 'queued').length);
    expect(m.gaps.resolved).toBe(statuses.filter((s: string) => s === 'resolved').length);
    expect(m.gaps.unresolved).toBe(m.gaps.open + m.gaps.queued);
    expect(m.gaps.total).toBe(raw.entities.gaps.length);

    // Verification
    const verified = rawEntities.filter((e: { verified: boolean }) => e.verified).length;
    expect(m.verification.verified).toBe(verified);
    expect(m.verification.unverified).toBe(rawEntities.length - verified);
    expect(m.verification.total).toBe(rawEntities.length);

    // Freshness
    const newest = rawEntities.map((e: { updatedAt: string }) => e.updatedAt).sort().at(-1);
    expect(m.freshness.newestAt).toBe(newest);
    expect(m.freshness.totalEntities).toBe(rawEntities.length);
  });

  it('freshness counts stale items past the 90-day line', () => {
    const project = fixtureProject();
    // The Stage 1 fixture entities are stamped 2026-07-10; interview facts are "now".
    const later = new Date(new Date('2026-07-10T12:00:00.000Z').getTime() + (STALE_DAYS + 1) * 86400000);
    const m = computeMetrics(project, later);
    // Everything stamped on 2026-07-10 is now stale; entities created "now"
    // during fixture setup are not.
    const raw = JSON.parse(JSON.stringify(project.model));
    const rawEntities = COLLECTION_KEYS.flatMap((k: string) => raw.entities[k]);
    const cutoff = later.getTime() - STALE_DAYS * 86400000;
    const expected = rawEntities.filter(
      (e: { updatedAt: string }) => new Date(e.updatedAt).getTime() < cutoff).length;
    expect(m.freshness.staleCount).toBe(expected);
    expect(expected).toBeGreaterThan(0);
  });

  it('empty project: all zeros, no division blowups', () => {
    const project: ProjectFile = {
      formatVersion: PROJECT_FORMAT_VERSION,
      model: createEmptyModel('s7-empty', { businessName: 'X (FIXTURE)', ownerName: 'Y (fixture)' }),
      sessions: [],
    };
    const m = computeMetrics(project);
    expect(m.completeness.coveredAreas).toBe(0);
    expect(m.risks.count).toBe(0);
    expect(m.risks.averageScore).toBe(0);
    expect(m.gaps.total).toBe(0);
    expect(m.verification.percentVerified).toBe(0);
    expect(m.freshness.newestAt).toBeNull();
  });
});

describe('Stage 7 acceptance: AI export validates against the schema', () => {
  it('fixture project export round-trips and validates clean', () => {
    const project = fixtureProject();
    const json = exportModel(project.model);
    const back = importModel(json); // importModel throws unless validation is clean
    expect(validateModel(back)).toEqual([]);
    expect(exportModel(back)).toBe(json); // lossless
  });

  it('a corrupted export is rejected by validation', () => {
    const project = fixtureProject();
    const bad = exportModel(project.model).replace('"schemaVersion": "1.0.0"', '"schemaVersion": "9.9.9"');
    expect(() => importModel(bad)).toThrow('failed validation');
  });
});

describe('Stage 7: gap resolution from the dashboard', () => {
  it('marks resolved, updates timestamps, deletes nothing', () => {
    const project = fixtureProject();
    const before = project.model.entities.gaps.length;
    const target = project.model.entities.gaps.find((g) => g.status !== 'resolved')!;
    const next = resolveGap(project.model, target.id);
    expect(next.entities.gaps.length).toBe(before);
    expect(next.entities.gaps.find((g) => g.id === target.id)!.status).toBe('resolved');
    expect(validateModel(next)).toEqual([]);
    expect(() => resolveGap(project.model, 'ghost')).toThrow('No such gap');
  });
});
