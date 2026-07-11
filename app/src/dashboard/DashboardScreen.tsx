import { computeMetrics, resolveGap, SCORING_EXPLANATION } from './metrics';
import type { ProjectFile } from '../project/store';

export default function DashboardScreen({
  project, onSave, onBack,
}: {
  project: ProjectFile;
  onSave: (next: ProjectFile) => void;
  onBack: () => void;
}) {
  const m = computeMetrics(project);
  const openGaps = project.model.entities.gaps.filter((g) => g.status !== 'resolved');

  return (
    <section>
      <button className="quiet" onClick={onBack}>← Back to project</button>
      <h1 style={{ marginTop: '1rem' }}>Where things stand</h1>
      <p className="why">
        Why this page: one honest look at what has been captured, what is at
        risk, and what is still waiting. Every number here comes straight
        from the record - nothing is estimated.
      </p>

      <h2>Completeness</h2>
      <p>{m.completeness.coveredAreas} of {m.completeness.totalAreas} interview areas covered ({m.completeness.percent}%).</p>
      {m.completeness.perTrack.map((t) => (
        <p className="small muted" key={t.trackId} style={{ marginBottom: '0.25rem' }}>
          {t.title}: {t.covered} of {t.total}
        </p>
      ))}

      <h2>Risks</h2>
      {m.risks.count === 0 ? (
        <p>No risks are on record yet.</p>
      ) : (
        <>
          <p>
            {m.risks.count} risk{m.risks.count === 1 ? '' : 's'} on record ·{' '}
            {m.risks.byBand.high} high, {m.risks.byBand.medium} medium, {m.risks.byBand.low} low ·
            average score {m.risks.averageScore}
          </p>
          <p className="small muted">{SCORING_EXPLANATION}</p>
          {m.risks.scored.map((s) => (
            <div className="card" key={s.risk.id}>
              <p className="small" style={{ marginBottom: '0.35rem' }}>
                <strong>{s.score} ({s.band})</strong> · {s.risk.riskKind}
              </p>
              <p className="small" style={{ marginBottom: '0.35rem' }}>{s.risk.description}</p>
              <p className="small muted">{s.reasons.join(' · ')}</p>
            </div>
          ))}
        </>
      )}

      <h2>Open questions</h2>
      <p>
        {m.gaps.unresolved} waiting ({m.gaps.open} open, {m.gaps.queued} queued) ·{' '}
        {m.gaps.resolved} resolved · {m.gaps.total} raised in all
      </p>
      {openGaps.map((g) => (
        <div className="card" key={g.id}>
          <p className="small" style={{ marginBottom: '0.5rem' }}>{g.question}</p>
          <p className="small muted" style={{ marginBottom: '0.5rem' }}>Raised because: {g.raisedBecause}</p>
          <button className="quiet"
            onClick={() => onSave({ ...project, model: resolveGap(project.model, g.id) })}>
            Mark resolved
          </button>
        </div>
      ))}

      <h2>Confirmed by you</h2>
      <p>
        {m.verification.verified} of {m.verification.total} items confirmed ({m.verification.percentVerified}%).
        Unconfirmed items carry "needs verification" in every document until you confirm them.
      </p>

      <h2>Freshness</h2>
      {m.freshness.newestAt === null ? (
        <p>Nothing captured yet.</p>
      ) : (
        <p>
          Most recent capture: {m.freshness.daysSinceNewest === 0 ? 'today' : `${m.freshness.daysSinceNewest} day${m.freshness.daysSinceNewest === 1 ? '' : 's'} ago`}.{' '}
          {m.freshness.staleCount === 0
            ? 'Nothing on record is older than 90 days.'
            : `${m.freshness.staleCount} item${m.freshness.staleCount === 1 ? '' : 's'} on record ${m.freshness.staleCount === 1 ? 'has' : 'have'} not been touched in 90 days or more - businesses change; consider a review session.`}
        </p>
      )}
    </section>
  );
}
