import { useMemo, useState } from 'react';
import { RuleBasedEngine, TRACKS, trackById } from './engine';
import type { ProjectFile, SessionMeta } from '../project/store';

export default function InterviewScreen({
  project, session, onSave, onBack,
}: {
  project: ProjectFile;
  session: SessionMeta;
  onSave: (next: ProjectFile) => void;
  onBack: () => void;
}) {
  const engine = useMemo(() => new RuleBasedEngine(), []);
  const [trackId, setTrackId] = useState<string | null>(session.trackId ?? null);
  const [answer, setAnswer] = useState('');
  const [lastExtract, setLastExtract] = useState('');
  const [revisitAreaId, setRevisitAreaId] = useState<string | null>(null);

  const memory = project.interviewMemory ?? engine.createMemory();

  if (!trackId) {
    return (
      <section>
        <button className="quiet" onClick={onBack}>← Back to sessions</button>
        <h1 style={{ marginTop: '1rem' }}>Choose a part of the interview</h1>
        <p className="why">
          Why parts: the interview covers eight parts of how you run the
          business. Do them in any order, one sitting at a time. Anything
          left unanswered is remembered and asked again later - nothing
          gets lost between sittings.
        </p>
        {TRACKS.map((t) => {
          const c = engine.coverage(memory, t.id);
          const threads = memory.pendingThreads.filter((f) => f.trackId === t.id).length;
          return (
            <div className="card" key={t.id}>
              <p style={{ marginBottom: '0.35rem' }}>{t.n}. {t.title}</p>
              <p className="small muted" style={{ marginBottom: '0.6rem' }}>
                {c.covered} of {c.total} covered
                {threads > 0 ? ` · ${threads} follow-up${threads === 1 ? '' : 's'} waiting` : ''}
              </p>
              <button onClick={() => {
                setTrackId(t.id);
                if (session.trackId !== t.id) {
                  onSave({
                    ...project,
                    sessions: project.sessions.map((s) =>
                      s.id === session.id ? { ...s, trackId: t.id } : s),
                  });
                }
              }}>
                {c.covered === 0 ? 'Begin' : c.covered === c.total ? 'Review' : 'Continue'}
              </button>
            </div>
          );
        })}
      </section>
    );
  }

  const track = trackById(trackId);
  const q = engine.nextQuestion(memory, trackId);
  const questionText = revisitAreaId ? engine.revisitQuestion(trackId, revisitAreaId) : q.question;
  const showInput = revisitAreaId !== null || q.areaId !== 'done';

  const submit = () => {
    if (!answer.trim()) return;
    const result = engine.ingestAnswer(
      memory, project.model, session.id, trackId, answer, revisitAreaId ?? undefined,
    );
    const nextProject: ProjectFile = {
      ...project,
      model: result.model,
      interviewMemory: result.memory,
      sessions: project.sessions.map((s) =>
        s.id === session.id
          ? { ...s, trackId, transcript: [...(s.transcript ?? []), result.qa] }
          : s,
      ),
    };
    setAnswer('');
    setRevisitAreaId(null);
    const { facts, gaps, risks, contradictions } = result.extracted;
    const parts: string[] = [];
    if (facts) parts.push(`${facts} answer captured in your words`);
    if (contradictions) parts.push('an earlier answer says something different - we will ask which is right');
    if (gaps - contradictions > 0) parts.push(`${gaps - contradictions} name${gaps - contradictions === 1 ? '' : 's'} we will ask about`);
    if (risks) parts.push(`${risks} thing${risks === 1 ? '' : 's'} only you handle, noted`);
    setLastExtract(parts.join(' · '));
    onSave(nextProject);
  };

  const answeredAreas = memory.trackProgress[trackId]?.answeredAreas ?? [];

  return (
    <section>
      <button className="quiet" onClick={() => setTrackId(null)}>← All parts</button>
      <h1 style={{ marginTop: '1rem' }}>{track.title}</h1>
      <p className="small muted">
        {q.coverage.covered} of {q.coverage.total} areas covered
        {memory.pendingThreads.length > 0
          ? ` · ${memory.pendingThreads.length} follow-up${memory.pendingThreads.length === 1 ? '' : 's'} waiting overall`
          : ''}
      </p>

      <div className="card" style={{ marginTop: '0.75rem' }}>
        {!revisitAreaId && q.isFollowUp && q.reason && (
          <p className="small muted" style={{ marginBottom: '0.5rem' }}>
            A follow-up{q.fromTrackTitle ? ` from "${q.fromTrackTitle}"` : ''}: {q.reason}
          </p>
        )}
        <p style={{ marginBottom: showInput ? '0.9rem' : 0 }}>{questionText}</p>
        {showInput && (
          <>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={5}
              style={{
                font: 'inherit', width: '100%', padding: '0.5rem 0.6rem',
                border: '1px solid var(--rule)', borderRadius: '2px', resize: 'vertical',
              }}
              aria-label="Your answer"
            />
            <div className="row" style={{ marginTop: '0.75rem' }}>
              <button className="primary" onClick={submit}>That's my answer</button>
              {revisitAreaId && (
                <button className="quiet" onClick={() => setRevisitAreaId(null)}>Never mind</button>
              )}
              <span className="small muted">Saved to this computer the moment you submit.</span>
            </div>
          </>
        )}
      </div>

      {lastExtract && <p className="small muted">{lastExtract}</p>}

      {answeredAreas.length > 0 && !revisitAreaId && (
        <details style={{ marginTop: '1.25rem' }}>
          <summary className="small muted" style={{ cursor: 'pointer' }}>
            Revisit a question you already answered
          </summary>
          <p className="why" style={{ marginTop: '0.5rem' }}>
            Why revisit: memories sharpen, and second answers are often
            better ones. If a new answer differs from the old, we will show
            you both and ask which is right.
          </p>
          {track.areas.filter((a) => answeredAreas.includes(a.id)).map((a) => (
            <div className="card" key={a.id}>
              <p className="small" style={{ marginBottom: '0.5rem' }}>{a.question}</p>
              <button className="quiet" onClick={() => setRevisitAreaId(a.id)}>Answer again</button>
            </div>
          ))}
        </details>
      )}

      <p className="small muted" style={{ marginTop: '1.5rem' }}>
        Captured so far in this project: {project.model.entities.facts.length} answers,{' '}
        {project.model.entities.gaps.length} open questions,{' '}
        {project.model.entities.risks.length} noted risks.
      </p>
    </section>
  );
}
