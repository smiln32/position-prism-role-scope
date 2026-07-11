import type { KnowledgeModel, RiskEntity, EntityBase } from '../knowledge-model/schema';
import { COLLECTION_KEYS } from '../knowledge-model/schema';
import { TRACKS } from '../interview/engine';
import type { ProjectFile } from '../project/store';

/**
 * Dashboard metrics & risk scoring - Stage 7. Deterministic formulas,
 * printed where owners can see them (see DECISIONS.md). Every number here
 * is recounted independently in the test suite and must match exactly.
 */

export type RiskBand = 'high' | 'medium' | 'low';

export interface ScoredRisk {
  risk: RiskEntity;
  score: number;
  band: RiskBand;
  reasons: string[];
}

export const SCORING_EXPLANATION =
  'Score = 40 base, +25 single point of failure, +20 no mitigation on record, ' +
  '+10 not yet verified, +5/-0/-5 for high/medium/low confidence, capped at 100. ' +
  '70 and above is high, 40 to 69 medium, below 40 low.';

export function scoreRisk(risk: RiskEntity): ScoredRisk {
  let score = 40;
  const reasons: string[] = ['base 40'];
  if (risk.riskKind.toLowerCase().includes('single')) { score += 25; reasons.push('single point of failure +25'); }
  const hasMitigation = Boolean(risk.mitigation && risk.mitigation.trim());
  if (!hasMitigation) { score += 20; reasons.push('no mitigation on record +20'); }
  if (!risk.verified) { score += 10; reasons.push('not yet verified +10'); }
  if (risk.confidence === 'high') { score += 5; reasons.push('high confidence +5'); }
  if (risk.confidence === 'low') { score -= 5; reasons.push('low confidence -5'); }
  score = Math.min(100, Math.max(0, score));
  const band: RiskBand = score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';
  return { risk, score, band, reasons };
}

export interface Metrics {
  completeness: {
    coveredAreas: number;
    totalAreas: number;
    percent: number;
    perTrack: { trackId: string; title: string; covered: number; total: number }[];
  };
  risks: {
    count: number;
    byBand: { high: number; medium: number; low: number };
    averageScore: number; // 0 when no risks
    scored: ScoredRisk[];
  };
  gaps: { open: number; queued: number; resolved: number; unresolved: number; total: number };
  verification: { verified: number; unverified: number; total: number; percentVerified: number };
  freshness: {
    newestAt: string | null;
    daysSinceNewest: number | null;
    staleCount: number; // entities not updated in 90+ days
    totalEntities: number;
  };
}

export const STALE_DAYS = 90;

function allEntities(model: KnowledgeModel): EntityBase[] {
  return COLLECTION_KEYS.flatMap((k) => model.entities[k] as EntityBase[]);
}

export function computeMetrics(project: ProjectFile, now: Date = new Date()): Metrics {
  const model = project.model;
  const memory = project.interviewMemory;

  const perTrack = TRACKS.map((t) => ({
    trackId: t.id,
    title: t.title,
    covered: memory?.trackProgress[t.id]?.answeredAreas.length ?? 0,
    total: t.areas.length,
  }));
  const coveredAreas = perTrack.reduce((n, t) => n + t.covered, 0);
  const totalAreas = perTrack.reduce((n, t) => n + t.total, 0);

  const scored = model.entities.risks.map(scoreRisk);
  const byBand = {
    high: scored.filter((s) => s.band === 'high').length,
    medium: scored.filter((s) => s.band === 'medium').length,
    low: scored.filter((s) => s.band === 'low').length,
  };
  const averageScore = scored.length === 0
    ? 0
    : Math.round(scored.reduce((n, s) => n + s.score, 0) / scored.length);

  const gapsList = model.entities.gaps;
  const gaps = {
    open: gapsList.filter((g) => g.status === 'open').length,
    queued: gapsList.filter((g) => g.status === 'queued').length,
    resolved: gapsList.filter((g) => g.status === 'resolved').length,
    unresolved: gapsList.filter((g) => g.status !== 'resolved').length,
    total: gapsList.length,
  };

  const entities = allEntities(model);
  const verified = entities.filter((e) => e.verified).length;
  const verification = {
    verified,
    unverified: entities.length - verified,
    total: entities.length,
    percentVerified: entities.length === 0 ? 0 : Math.round((verified / entities.length) * 100),
  };

  let newestAt: string | null = null;
  let staleCount = 0;
  const staleCutoff = now.getTime() - STALE_DAYS * 24 * 60 * 60 * 1000;
  for (const e of entities) {
    if (newestAt === null || e.updatedAt > newestAt) newestAt = e.updatedAt;
    if (new Date(e.updatedAt).getTime() < staleCutoff) staleCount++;
  }
  const freshness = {
    newestAt,
    daysSinceNewest: newestAt === null
      ? null
      : Math.floor((now.getTime() - new Date(newestAt).getTime()) / (24 * 60 * 60 * 1000)),
    staleCount,
    totalEntities: entities.length,
  };

  return {
    completeness: {
      coveredAreas, totalAreas,
      percent: totalAreas === 0 ? 0 : Math.round((coveredAreas / totalAreas) * 100),
      perTrack,
    },
    risks: { count: scored.length, byBand, averageScore, scored },
    gaps,
    verification,
    freshness,
  };
}

/** Owner-directed gap resolution. Never deletes (see DECISIONS.md). */
export function resolveGap(model: KnowledgeModel, gapId: string): KnowledgeModel {
  const next: KnowledgeModel = JSON.parse(JSON.stringify(model));
  const gap = next.entities.gaps.find((g) => g.id === gapId);
  if (!gap) throw new Error(`No such gap: ${gapId}`);
  const now = new Date().toISOString();
  gap.status = 'resolved';
  gap.updatedAt = now;
  next.updatedAt = now;
  return next;
}
