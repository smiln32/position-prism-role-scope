import { useMemo, useState } from 'react';
import { RuleBasedEngine, TRACK_1, type InterviewState } from './engine';
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
  const [state, setState] = useState<InterviewState>(
    () => session.interview ?? engine.createState(),
  );
  const [answer, setAnswer] = useState('');
  const [lastExtract, setLastExtract] = useState<string>('');

  const q = engine.nextQuestion(state);

  const submit = () => {
    if (!answer.trim()) return;
    const result = engine.ingestAnswer(state, project.model, session.id, answer);
    const nextProject: ProjectFile = {
      ...project,
      model: result.model,
      sessions: project.sessions.map((s) =>
        s.id === session.id ? { ...s, interview: result.state } : s,
      ),
    };
    setState(result.state);
    setAnswer('');
    const { facts, gaps, risks } = result.extracted;
    const parts: string[] = [];
    if (facts) parts.push(`${facts} answer captured in your words`);
    if (gaps) parts.push(`${gaps} name${gaps === 1 ? '' : 's'} we will ask about`);
    if (risks) parts.push(`${risks} thing${risks === 1 ? '' : 's'} only you handle, noted`);
    setLastExtract(parts.join(' · '));
    onSave(nextProject);
  };

  const captured = project.model.entities;

  return (
    <section>
      <button className="quiet" onClick={onBack}>← Back to sessions</button>
      <h1 style={{ marginTop: '1rem' }}>{TRACK_1.title}</h1>
      <p className="why">
        Why this interview: this part captures what you actually do - the
        day, the week, the year - so a successor can see the business from
        your chair. Answer in your own words; everything is saved exactly as
        you say it. Take your time, and stop whenever you like.
      </p>

      <p className="small muted">
        {q.coverage.covered} of {q.coverage.total} areas covered
        {state.followUpQueue.length > 0
          ? ` · ${state.followUpQueue.length} follow-up${state.followUpQueue.length === 1 ? '' : 's'} waiting`
          : ''}
      </p>

      <div className="card" style={{ marginTop: '0.75rem' }}>
        {q.isFollowUp && q.reason && (
          <p className="small muted" style={{ marginBottom: '0.5rem' }}>
            A follow-up: {q.reason}
          </p>
        )}
        <p style={{ marginBottom: q.complete ? 0 : '0.9rem' }}>{q.question}</p>
        {!q.complete && (
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
              <span className="small muted">Saved to this computer the moment you submit.</span>
            </div>
          </>
        )}
      </div>

      {lastExtract && <p className="small muted">{lastExtract}</p>}

      <p className="small muted" style={{ marginTop: '1.5rem' }}>
        Captured so far in this project: {captured.facts.length} answers,{' '}
        {captured.gaps.length} open questions, {captured.risks.length} noted risks.
      </p>
    </section>
  );
}
