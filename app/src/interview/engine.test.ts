import { describe, it, expect } from 'vitest';
import { RuleBasedEngine, detectUndefinedNames, trackById, trackSetFor, TRACKS, ROLE_TRACKS } from './engine';

const TRACK_1 = trackById('track-1');
import { createEmptyModel, validateModel } from '../knowledge-model/model';
import { scoreRisk } from '../dashboard/metrics';

/**
 * Stage 3 acceptance: a scripted 10-answer session on Track 1 must produce
 * correct extractions (checked against the transcript), ZERO fabricated
 * items, and an accurate coverage readout.
 *
 * Fixture answers are fictional (Hartwell-style). See DECISIONS.md.
 */

const ANSWERS: string[] = [
  // 1 daily -> mentions Denise mid-sentence -> gap + follow-up
  'I get in at 6:30, walk the floor, check every machine that ran overnight, then sit with the schedule until Denise gets in around 8.',
  // 2 follow-up: who is Denise
  'Denise is our office manager, been here nineteen years. She runs billing, payroll, and keeps the front office honest.',
  // 3 weekly -> "Only I know" -> risk + follow-up
  'Every Friday I do the quote review myself. Only I know how to price the aerospace work because the margins hide in the setup time.',
  // 4 follow-up: only-you probe -> mentions Marcus mid-sentence -> gap + follow-up
  'Honestly it would take a year working next to me. I think Marcus could learn it, he has the feel for setups.',
  // 5 follow-up: who is Marcus
  'Marcus is my lead machinist, fifteen years with us. He has the best hands in the shop.',
  // 6 annual (March / Christmas are stoplisted, no gaps)
  'Insurance renewal in March, the big customer audits in the fall, and Christmas week we do maintenance because the shop is quiet.',
  // 7 owner-only -> "Nobody else" -> risk + follow-up
  'Pricing, the bank, and firing come to me. Nobody else touches those three things at all.',
  // 8 follow-up: only-you probe -> mentions Lisa mid-sentence -> gap + follow-up
  'The pricing lives in my head and I would have to write it down. Our banker Lisa only works with me directly.',
  // 9 follow-up: who is Lisa
  'She is our banker downtown and she carried us through a rough stretch on nothing but a handshake.',
  // 10 first-break
  'Scheduling would break first. The whiteboard in my office is the real schedule, not what the computer says.',
];

describe('Stage 3 acceptance: Track 1 rule-based interview', () => {
  it('10-answer session: correct extractions, zero fabrication, accurate coverage', () => {
    const engine = new RuleBasedEngine();
    let state = engine.createMemory();
    let model = createEmptyModel('stage3-accept', {
      businessName: 'Hartwell Machine & Tool (FIXTURE)',
      ownerName: 'Ray Hartwell (fictional)',
    });

    const askedQuestions: string[] = [];
    for (const answer of ANSWERS) {
      const q = engine.nextQuestion(state, 'track-1');
      expect(q.trackComplete).toBe(false);
      askedQuestions.push(q.question);
      const result = engine.ingestAnswer(state, model, 'sess_stage3', 'track-1', answer);
      state = result.memory;
      model = result.model;
    }

    // --- Model stays valid against the frozen contract ---
    expect(validateModel(model)).toEqual([]);

    // --- ZERO FABRICATION AUDIT ---
    // Every fact statement must be, verbatim, one of the owner's answers.
    for (const f of model.entities.facts) {
      expect(ANSWERS.map((a) => a.trim())).toContain(f.statement);
    }
    // Every risk must quote a sentence that appears inside some answer.
    for (const r of model.entities.risks) {
      const quoted = r.description.replace(/^In the owner's words: "/, '').replace(/"$/, '');
      expect(ANSWERS.some((a) => a.includes(quoted))).toBe(true);
      expect(r.sources[0].kind).toBe('inferred'); // inference is labeled as inference
    }
    // Every gap's name must literally appear in some answer.
    for (const g of model.entities.gaps) {
      const m = g.question.match(/"([^"]+)"/);
      expect(m).not.toBeNull();
      expect(ANSWERS.some((a) => a.includes(m![1]))).toBe(true);
    }

    // --- CORRECT EXTRACTIONS (spot-check against transcript) ---
    expect(model.entities.facts.length).toBe(10); // one verbatim fact per answer
    const gapNames = model.entities.gaps.map((g) => g.question);
    expect(gapNames.some((q) => q.includes('Denise'))).toBe(true);
    expect(gapNames.some((q) => q.includes('Marcus'))).toBe(true);
    expect(gapNames.some((q) => q.includes('Lisa'))).toBe(true);
    // Names that were later explained arrived as follow-up questions:
    expect(askedQuestions.some((q) => q.includes('"Denise"'))).toBe(true);
    expect(askedQuestions.some((q) => q.includes('"Marcus"'))).toBe(true);
    // "Only I know how to price" produced a single-point-of-failure risk:
    expect(model.entities.risks.some((r) => r.description.includes('Only I know how to price'))).toBe(true);
    // "Nobody else does those" produced a risk too:
    expect(model.entities.risks.some((r) => r.description.includes('Nobody else touches those three things'))).toBe(true);

    // --- COVERAGE READOUT ---
    const q = engine.nextQuestion(state, 'track-1');
    expect(q.coverage.total).toBe(TRACK_1.areas.length);
    expect(q.coverage.covered).toBe(state.trackProgress['track-1'].answeredAreas.length);
    expect(q.coverage.covered).toBe(5); // daily, weekly, annual, owner-only, first-break
    expect(q.trackComplete).toBe(false); // three areas remain - honest, not padded

    // Every source is attributed to the session.
    const all = [...model.entities.facts];
    for (const f of all) {
      expect(f.sources[0].kind).toBe('interview');
      expect(f.sources[0].sessionId).toBe('sess_stage3');
    }
  });

  it('completes when all areas are covered and queue is empty', () => {
    const engine = new RuleBasedEngine();
    let state = engine.createMemory();
    let model = createEmptyModel('stage3-complete', {
      businessName: 'X (FIXTURE)', ownerName: 'Y (fixture)',
    });
    // Long, name-free, pattern-free answers so no follow-ups queue.
    const plain = 'We handle that the same way every time and the whole crew already knows the routine well.';
    for (let i = 0; i < TRACK_1.areas.length; i++) {
      const r = engine.ingestAnswer(state, model, 's', 'track-1', plain);
      state = r.memory; model = r.model;
    }
    const q = engine.nextQuestion(state, 'track-1');
    expect(q.trackComplete).toBe(true);
    expect(q.coverage.covered).toBe(TRACK_1.areas.length);
    expect(engine.allComplete(state)).toBe(false); // other tracks remain
  });

  it('empty answers extract nothing and fabricate nothing', () => {
    const engine = new RuleBasedEngine();
    const state = engine.createMemory();
    const model = createEmptyModel('stage3-empty', {
      businessName: 'X (FIXTURE)', ownerName: 'Y (fixture)',
    });
    const r = engine.ingestAnswer(state, model, 's', 'track-1', '   ');
    expect(r.extracted).toEqual({ facts: 0, gaps: 0, risks: 0, contradictions: 0 });
    expect(r.model.entities.facts.length).toBe(0);
  });

  it('name detection is conservative', () => {
    expect(detectUndefinedNames('Denise gets in at 8 every day.', [])).toEqual([]); // sentence-initial: skipped
    expect(detectUndefinedNames('I sit with Denise every morning.', [])).toEqual(['Denise']);
    expect(detectUndefinedNames('I sit with Denise every morning.', ['denise'])).toEqual([]);
    expect(detectUndefinedNames('We close between Christmas and New Year.', [])).toEqual([]);
    expect(detectUndefinedNames('Every Monday I call the bank.', [])).toEqual([]);
  });

  it('a brief answer queues one gentle probe', () => {
    const engine = new RuleBasedEngine();
    let state = engine.createMemory();
    let model = createEmptyModel('stage3-short', {
      businessName: 'X (FIXTURE)', ownerName: 'Y (fixture)',
    });
    const r = engine.ingestAnswer(state, model, 's', 'track-1', 'Same thing every day.');
    state = r.memory; model = r.model;
    const q = engine.nextQuestion(state, 'track-1');
    expect(q.isFollowUp).toBe(true);
    expect(q.question).toContain('say a little more');
    // Verbatim fact still captured, nothing invented:
    expect(model.entities.facts[0].statement).toBe('Same thing every day.');
  });
});

/**
 * P5 (2026-07-16). Track 7 is titled "Risks & Fragilities" and asked six
 * questions about risk - and no answer to any of them ever became a
 * RiskEntity. The Risk Report saw only regex-detected "only I do that" risks.
 * Now a substantive Track 7 answer is recorded as an owner-declared risk:
 * verbatim, source 'interview' (the owner said it), high confidence,
 * unverified. See DECISIONS.md 2026-07-16.
 */
describe('P5: Track 7 answers become owner-declared risks', () => {
  const setup = () => {
    const engine = new RuleBasedEngine();
    return {
      engine,
      memory: engine.createMemory(),
      model: createEmptyModel('p5', { businessName: 'B', ownerName: 'O' }),
    };
  };

  it('records a substantive answer as a risk, verbatim, owner-sourced', () => {
    const { engine, memory, model } = setup();
    const answer = 'Losing the aerospace pricing knowledge worries me the most because it lives in one head.';
    const r = engine.ingestAnswer(memory, model, 's1', 'track-7', answer);
    expect(r.extracted.risks).toBe(1);
    const risk = r.model.entities.risks[0];
    expect(risk.description).toBe(answer);          // verbatim, not paraphrased
    expect(risk.sources[0].kind).toBe('interview'); // owner-declared, not inferred
    expect(risk.confidence).toBe('high');
    expect(risk.verified).toBe(false);
    expect(risk.riskKind).toBe('owner concern');    // track-7 area 1 is keeps-up
  });

  it('a dismissal is an answer, not a risk', () => {
    const { engine, memory, model } = setup();
    const r = engine.ingestAnswer(memory, model, 's1', 'track-7', 'Nothing really keeps me up these days.');
    expect(r.extracted.risks).toBe(0);
    expect(r.extracted.facts).toBe(1); // still captured verbatim as a fact
  });

  it('an answer outside a risk area creates no risk', () => {
    const { engine, memory, model } = setup();
    const r = engine.ingestAnswer(memory, model, 's1', 'track-1',
      'I open the shop at six and walk the floor before anyone arrives.');
    expect(r.extracted.risks).toBe(0);
  });

  it('owner-declared risks finally give the scoring some spread', () => {
    const { engine, memory, model } = setup();
    // keeps-up: owner concern -> 40 + 20 (no mitigation) + 10 (unverified) + 5 (high) = 75
    let r = engine.ingestAnswer(memory, model, 's1', 'track-7',
      'Cash gets thin every winter and we ride the line of credit harder than anyone knows.');
    // single-points + "only I" phrasing -> the inferred SPOF risk (95) alongside
    // the owner-declared single point of failure risk (100).
    r = engine.ingestAnswer(r.memory, r.model, 's1', 'track-7',
      'Only I know how to quote the aerospace work, and everything depends on the one CNC.');
    const scores = r.model.entities.risks.map((k) => scoreRisk(k).score).sort((a, b) => a - b);
    expect(new Set(scores).size).toBeGreaterThan(1); // no longer one flat number
    expect(scores).toContain(75);
  });
});

/**
 * Role-level interviews (2026-07-17). Owner's principle: "Each person in a
 * role should be interviewed and the business owner only as a fallback. Who
 * knows the actual job better?" A model whose subjectRole is a role title
 * uses ROLE_TRACKS; 'owner' keeps the original eight. See DECISIONS.md.
 */
describe('Role-level interviews', () => {
  const roleModel = () => {
    const m = createEmptyModel('role-test', { businessName: 'B', ownerName: 'O' }, 'Bookkeeper');
    return m;
  };

  it('subjectRole selects the track set; owner is unchanged', () => {
    expect(trackSetFor('owner')).toBe(TRACKS);
    expect(trackSetFor('Bookkeeper')).toBe(ROLE_TRACKS);
    expect(roleModel().subjectRole).toBe('Bookkeeper');
    expect(createEmptyModel('x', { businessName: 'B', ownerName: 'O' }).subjectRole).toBe('owner');
  });

  it('role tracks: 7 tracks, 44 areas, ids distinct from owner tracks', () => {
    expect(ROLE_TRACKS.length).toBe(7);
    expect(ROLE_TRACKS.reduce((n, t) => n + t.areas.length, 0)).toBe(44);
    const ownerIds = new Set(TRACKS.map((t) => t.id));
    for (const t of ROLE_TRACKS) expect(ownerIds.has(t.id)).toBe(false);
  });

  it('a role interview runs end to end on role tracks', () => {
    const engine = new RuleBasedEngine();
    const memory = engine.createMemory();
    const model = roleModel();
    const q = engine.nextQuestion(memory, 'role-1', model.subjectRole);
    expect(q.question).toContain('normal working day in this job');
    const r = engine.ingestAnswer(memory, model, 's1', 'role-1',
      'First thing I reconcile the bank feed, then I run the aging report before anyone asks for it.');
    expect(r.extracted.facts).toBe(1);
    expect(r.model.entities.facts[0].topic).toBe('role-1:daily');
  });

  it('completion is judged against the ROLE set for a role subject', () => {
    const engine = new RuleBasedEngine();
    let memory = engine.createMemory();
    let model = roleModel();
    // Answer every area of every role track (12+ words, no risk phrasing).
    for (const t of ROLE_TRACKS) {
      for (let i = 0; i < t.areas.length; i++) {
        const r = engine.ingestAnswer(memory, model, 's1', t.id,
          'That part of the job is steady and shared, the whole team handles it together without drama every single time.');
        memory = r.memory; model = r.model;
      }
    }
    // Drain any queued follow-up threads the same way.
    let guard = 0;
    while (memory.pendingThreads.length > 0 && guard++ < 50) {
      const r = engine.ingestAnswer(memory, model, 's1', memory.pendingThreads[0].trackId,
        'Nothing more to add on that one, it is genuinely covered by several people already.');
      memory = r.memory; model = r.model;
    }
    expect(engine.allComplete(memory, model.subjectRole)).toBe(true);
    // The same memory is NOT complete by the owner's yardstick (50 areas).
    expect(engine.allComplete(memory, 'owner')).toBe(false);
  });

  it('role-5 risk areas produce owner-declared risks like track-7 does', () => {
    const engine = new RuleBasedEngine();
    const memory = engine.createMemory();
    const model = roleModel();
    const r = engine.ingestAnswer(memory, model, 's1', 'role-5',
      'The month-end close breaks whenever the freight invoices come in late and I rebuild the sheet by hand.');
    expect(r.extracted.risks).toBe(1);
    expect(r.model.entities.risks[0].riskKind).toBe('recurring problem');
    expect(r.model.entities.risks[0].sources[0].kind).toBe('interview');
  });
});
