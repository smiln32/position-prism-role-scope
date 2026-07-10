import { describe, it, expect } from 'vitest';
import { RuleBasedEngine, detectUndefinedNames, TRACK_1 } from './engine';
import { createEmptyModel, validateModel } from '../knowledge-model/model';

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
    let state = engine.createState();
    let model = createEmptyModel('stage3-accept', {
      businessName: 'Hartwell Machine & Tool (FIXTURE)',
      ownerName: 'Ray Hartwell (fictional)',
    });

    const askedQuestions: string[] = [];
    for (const answer of ANSWERS) {
      const q = engine.nextQuestion(state);
      expect(q.complete).toBe(false);
      askedQuestions.push(q.question);
      const result = engine.ingestAnswer(state, model, 'sess_stage3', answer);
      state = result.state;
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
    const q = engine.nextQuestion(state);
    expect(q.coverage.total).toBe(TRACK_1.areas.length);
    expect(q.coverage.covered).toBe(state.answeredAreas.length);
    expect(q.coverage.covered).toBe(5); // daily, weekly, annual, owner-only, first-break
    expect(q.complete).toBe(false); // three areas remain - honest, not padded

    // Every source is attributed to the session.
    const all = [...model.entities.facts];
    for (const f of all) {
      expect(f.sources[0].kind).toBe('interview');
      expect(f.sources[0].sessionId).toBe('sess_stage3');
    }
  });

  it('completes when all areas are covered and queue is empty', () => {
    const engine = new RuleBasedEngine();
    let state = engine.createState();
    let model = createEmptyModel('stage3-complete', {
      businessName: 'X (FIXTURE)', ownerName: 'Y (fixture)',
    });
    // Long, name-free, pattern-free answers so no follow-ups queue.
    const plain = 'We handle that the same way every time and the whole crew already knows the routine well.';
    for (let i = 0; i < TRACK_1.areas.length; i++) {
      const r = engine.ingestAnswer(state, model, 's', plain);
      state = r.state; model = r.model;
    }
    const q = engine.nextQuestion(state);
    expect(q.complete).toBe(true);
    expect(q.coverage.covered).toBe(TRACK_1.areas.length);
    expect(state.complete).toBe(true);
  });

  it('empty answers extract nothing and fabricate nothing', () => {
    const engine = new RuleBasedEngine();
    const state = engine.createState();
    const model = createEmptyModel('stage3-empty', {
      businessName: 'X (FIXTURE)', ownerName: 'Y (fixture)',
    });
    const r = engine.ingestAnswer(state, model, 's', '   ');
    expect(r.extracted).toEqual({ facts: 0, gaps: 0, risks: 0 });
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
    let state = engine.createState();
    let model = createEmptyModel('stage3-short', {
      businessName: 'X (FIXTURE)', ownerName: 'Y (fixture)',
    });
    const r = engine.ingestAnswer(state, model, 's', 'Same thing every day.');
    state = r.state; model = r.model;
    const q = engine.nextQuestion(state);
    expect(q.isFollowUp).toBe(true);
    expect(q.question).toContain('say a little more');
    // Verbatim fact still captured, nothing invented:
    expect(model.entities.facts[0].statement).toBe('Same thing every day.');
  });
});
