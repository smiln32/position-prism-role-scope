import { describe, it, expect } from 'vitest';
import { RuleBasedEngine, TRACKS } from './engine';
import { createEmptyModel, validateModel } from '../knowledge-model/model';
import { migrateProject, PROJECT_FORMAT_VERSION, type ProjectFile } from '../project/store';

/**
 * Stage 4 acceptance (spec): the multi-session test script must show
 * contradictions flagged, unresolved threads revisited across sessions,
 * and all eight tracks reachable. Fixture data - fictional business.
 */

describe('Stage 4 acceptance: multi-session behavior', () => {
  it('unresolved threads persist across sessions and are asked first', () => {
    const engine = new RuleBasedEngine();
    let memory = engine.createMemory();
    let model = createEmptyModel('s4-threads', {
      businessName: 'Hartwell Machine & Tool (FIXTURE)', ownerName: 'Ray (fictional)',
    });

    // --- SESSION 1: one answer that queues a name thread, then the owner stops ---
    let r = engine.ingestAnswer(memory, model, 'sess_1', 'track-1',
      'I open up, walk the floor, and go over the schedule with Denise before the crew arrives.');
    memory = r.memory; model = r.model;
    expect(memory.pendingThreads.length).toBe(1);
    expect(memory.pendingThreads[0].question).toContain('"Denise"');

    // Session ends. Memory lives on the project, not the session - a fresh
    // session sees the same memory object after save/load (proven in the
    // store walkthrough test); here we continue with it directly.

    // --- SESSION 2 (days later): the thread is the very first question ---
    const q = engine.nextQuestion(memory, 'track-1');
    expect(q.isFollowUp).toBe(true);
    expect(q.question).toContain('"Denise"');

    r = engine.ingestAnswer(memory, model, 'sess_2', 'track-1',
      'She is our office manager, nineteen years with us, runs billing and payroll.');
    memory = r.memory; model = r.model;
    expect(memory.pendingThreads.length).toBe(0);

    // Sources prove which session captured what.
    expect(model.entities.facts[0].sources[0].sessionId).toBe('sess_1');
    expect(model.entities.facts[1].sources[0].sessionId).toBe('sess_2');
  });

  it('threads from one track surface even when working another track', () => {
    const engine = new RuleBasedEngine();
    let memory = engine.createMemory();
    let model = createEmptyModel('s4-crosstrack', {
      businessName: 'X (FIXTURE)', ownerName: 'Y (fictional)',
    });

    // Track 2 answer mentions an unexplained name, owner switches to Track 8
    // and answers everything there.
    let r = engine.ingestAnswer(memory, model, 's1', 'track-2',
      'They stay because we never miss a date and because Tom answers his phone at night.');
    memory = r.memory; model = r.model;

    const plain = 'That part is straightforward and the whole team already understands how it works around here.';
    for (let i = 0; i < 6; i++) {
      r = engine.ingestAnswer(memory, model, 's2', 'track-8', plain);
      memory = r.memory; model = r.model;
    }
    // Track 8 is covered; the Track 2 thread about "Tom" must now surface here.
    const q = engine.nextQuestion(memory, 'track-8');
    expect(q.isFollowUp).toBe(true);
    expect(q.question).toContain('"Tom"');
    expect(q.fromTrackTitle).toBe('Customers & Revenue Truths');
  });

  it('WORKED CONTRADICTION: revisiting an area with a different answer flags it, quoting both', () => {
    const engine = new RuleBasedEngine();
    let memory = engine.createMemory();
    let model = createEmptyModel('s4-contradiction', {
      businessName: 'Hartwell Machine & Tool (FIXTURE)', ownerName: 'Ray (fictional)',
    });

    // SESSION 1, Track 3 banker area (first two areas answered plainly first).
    const supplierAnswer = 'Our steel comes from two brothers over in the valley and the relationship goes back thirty years.';
    let r = engine.ingestAnswer(memory, model, 'sess_1', 'track-3', supplierAnswer);
    memory = r.memory; model = r.model;
    const bankerV1 = 'We bank with the downtown branch and they renew our line every March without much conversation.';
    r = engine.ingestAnswer(memory, model, 'sess_1', 'track-3', bankerV1);
    memory = r.memory; model = r.model;

    // SESSION 2, weeks later: owner revisits the banker question, answers differently.
    const bankerV2 = 'The line renews in September, not the spring, and the branch wants a call from me before each renewal.';
    r = engine.ingestAnswer(memory, model, 'sess_2', 'track-3', bankerV2, 'banker');
    memory = r.memory; model = r.model;

    expect(r.extracted.contradictions).toBe(1);
    const contradiction = model.entities.gaps.find((g) =>
      g.raisedBecause.includes('differ between sessions'));
    expect(contradiction).toBeDefined();
    // Both answers quoted verbatim - zero fabrication:
    expect(contradiction!.question).toContain(bankerV1);
    expect(contradiction!.question).toContain(bankerV2);
    expect(contradiction!.question).toContain('Which is right');
    expect(contradiction!.sources[0].kind).toBe('inferred');
    // It links back to the original fact:
    const priorFact = model.entities.facts.find((f) => f.statement === bankerV1)!;
    expect(contradiction!.relatedIds).toContain(priorFact.id);
    // Both verbatim facts exist - nothing was overwritten or deleted:
    expect(model.entities.facts.some((f) => f.statement === bankerV1)).toBe(true);
    expect(model.entities.facts.some((f) => f.statement === bankerV2)).toBe(true);
    // The "which is right?" thread waits for a later session:
    expect(memory.pendingThreads.some((t) => t.question.includes('Which is right'))).toBe(true);
    // Re-answering the SAME thing is NOT a contradiction:
    const r2 = engine.ingestAnswer(memory, model, 'sess_3', 'track-3', supplierAnswer, 'suppliers');
    expect(r2.extracted.contradictions).toBe(0);

    expect(validateModel(model)).toEqual([]);
  });

  it('all eight tracks are reachable and each asks its own first question', () => {
    const engine = new RuleBasedEngine();
    const memory = engine.createMemory();
    expect(TRACKS.length).toBe(8);
    const seen = new Set<string>();
    for (const t of TRACKS) {
      const q = engine.nextQuestion(memory, t.id);
      expect(q.trackId).toBe(t.id);
      expect(q.areaId).toBe(t.areas[0].id);
      expect(q.question).toBe(t.areas[0].question);
      expect(seen.has(q.question)).toBe(false);
      seen.add(q.question);
    }
  });

  it('allComplete only when every area of every track is covered and no threads wait', () => {
    const engine = new RuleBasedEngine();
    let memory = engine.createMemory();
    let model = createEmptyModel('s4-complete', {
      businessName: 'X (FIXTURE)', ownerName: 'Y (fictional)',
    });
    const plain = 'That part is straightforward and the whole team already understands how it works around here.';
    for (const t of TRACKS) {
      for (let i = 0; i < t.areas.length; i++) {
        const r = engine.ingestAnswer(memory, model, 's', t.id, plain);
        memory = r.memory; model = r.model;
      }
    }
    expect(engine.allComplete(memory)).toBe(true);
    const q = engine.nextQuestion(memory, 'track-8');
    expect(q.allComplete).toBe(true);
    expect(q.question).toContain('Every part of the interview is covered');
  });

  it('legacy Stage 3 session state migrates into project memory', () => {
    const legacy: ProjectFile = {
      formatVersion: PROJECT_FORMAT_VERSION,
      model: createEmptyModel('s4-migrate', {
        businessName: 'X (FIXTURE)', ownerName: 'Y (fictional)',
      }),
      sessions: [{
        id: 'sess_old', label: 'Old sitting', startedAt: '2026-07-01T10:00:00.000Z',
        lastResumedAt: '2026-07-01T10:00:00.000Z', status: 'ended',
        interview: {
          trackId: 'track-1',
          answeredAreas: ['daily', 'weekly'],
          followUpQueue: [{ areaId: 'daily', question: 'You mentioned "Denise". Who or what is that, and what should the next person know?', reason: 'r' }],
          answerCount: 3,
          transcript: [{ areaId: 'daily', question: 'q', answer: 'a', answeredAt: '2026-07-01T10:01:00.000Z' }],
          knownNames: ['Denise'],
          complete: false,
        },
      } as ProjectFile['sessions'][number]],
    };
    const migrated = migrateProject(legacy);
    expect(migrated.interviewMemory).toBeDefined();
    expect(migrated.interviewMemory!.trackProgress['track-1'].answeredAreas).toEqual(['daily', 'weekly']);
    expect(migrated.interviewMemory!.pendingThreads[0].trackId).toBe('track-1');
    expect(migrated.interviewMemory!.knownNames).toEqual(['Denise']);
    expect(migrated.sessions[0].interview).toBeUndefined();
    expect(migrated.sessions[0].trackId).toBe('track-1');
    expect(migrated.sessions[0].transcript![0].trackId).toBe('track-1');
    // The old thread is the first question a new session sees:
    const engine = new RuleBasedEngine();
    const q = engine.nextQuestion(migrated.interviewMemory!, 'track-1');
    expect(q.question).toContain('"Denise"');
  });
});
