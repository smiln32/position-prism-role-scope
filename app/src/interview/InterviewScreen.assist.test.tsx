// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import InterviewScreen from './InterviewScreen';
import { AssistedExtraction, type LlmClient } from './llm';
import { createEmptyModel } from '../knowledge-model/model';
import { PROJECT_FORMAT_VERSION, type ProjectFile, type SessionMeta } from '../project/store';

afterEach(cleanup);

/**
 * The floor-then-enrich contract (2026-07-17, DECISIONS.md): the verbatim
 * answer is SAVED before any network call, the enrichment save is a second,
 * additive save, and an API failure costs nothing but a quiet note.
 */

const session: SessionMeta = {
  id: 's1', label: 'Sitting one', startedAt: '2026-07-17T00:00:00.000Z',
  lastResumedAt: '2026-07-17T00:00:00.000Z', status: 'active', trackId: 'track-3',
};

const project = (): ProjectFile => ({
  formatVersion: PROJECT_FORMAT_VERSION,
  model: createEmptyModel('as-t', { businessName: 'B Co', ownerName: 'O' }),
  sessions: [session],
});

const clientReturning = (toolInput: unknown): LlmClient => ({
  complete: async () => ({ text: '', toolInput, stopReason: 'tool_use' }),
});

const answerAndSubmit = () => {
  fireEvent.change(screen.getByLabelText('Your answer'), {
    target: { value: 'I told Henderson we would eat the freight on anything over ten cases, always have.' },
  });
  fireEvent.click(screen.getByRole('button', { name: "That's my answer" }));
};

describe('InterviewScreen with assisted interviewing', () => {
  it('saves the verbatim floor first, then the enrichment as a second save', async () => {
    const saves: ProjectFile[] = [];
    const assist = new AssistedExtraction(clientReturning({
      processes: [], decisions: [], relationships: [],
      commitments: [{ withWhom: 'Henderson', whatWasPromised: 'free freight over ten cases' }],
      systems: [], judgments: [], history: [],
      clarifications: [{ question: 'Does anyone else know the Henderson terms?' }],
    }));
    render(<InterviewScreen project={project()} session={session} assist={assist}
      onSave={(p) => saves.push(p)} onBack={() => {}} />);
    answerAndSubmit();

    await waitFor(() => expect(saves.length).toBe(2));
    // First save: the floor - verbatim fact, no drafts yet.
    expect(saves[0].model.entities.facts.length).toBe(1);
    expect(saves[0].model.entities.commitments.length).toBe(0);
    // Second save: floor plus the drafts and the queued clarification.
    expect(saves[1].model.entities.facts.length).toBe(1);
    expect(saves[1].model.entities.commitments.length).toBe(1);
    expect(saves[1].model.entities.commitments[0].verified).toBe(false);
    expect(saves[1].interviewMemory?.pendingThreads.map((t) => t.question))
      .toContain('Does anyone else know the Henderson terms?');
    // The feedback line reports the assisted work:
    expect(screen.getByText(/assisted: 1 structured draft to review, 1 clarifying question queued/)).toBeTruthy();
  });

  it('an API failure keeps the floor and says so quietly', async () => {
    const saves: ProjectFile[] = [];
    const assist = new AssistedExtraction({
      complete: async () => { throw new Error('boom'); },
    });
    render(<InterviewScreen project={project()} session={session} assist={assist}
      onSave={(p) => saves.push(p)} onBack={() => {}} />);
    answerAndSubmit();

    await waitFor(() => expect(screen.getByText(/assisted review unavailable/)).toBeTruthy());
    expect(saves.length).toBe(1); // the floor, saved before the call failed
    expect(saves[0].model.entities.facts.length).toBe(1);
  });

  it('without assist, submit behaves exactly as before - one save, no busy state', () => {
    const saves: ProjectFile[] = [];
    render(<InterviewScreen project={project()} session={session}
      onSave={(p) => saves.push(p)} onBack={() => {}} />);
    answerAndSubmit();
    expect(saves.length).toBe(1);
    expect(saves[0].model.entities.facts.length).toBe(1);
  });
});
