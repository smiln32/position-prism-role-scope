import { describe, it, expect } from 'vitest';
import { createEmptyModel, validateModel } from './model';
import {
  addRelationship, addDecision, addProcess, addJudgment,
  addHistory, addSystem, addCommitment, patchEntity, setVerified,
  addListItem, editListItem, removeListItem, listFieldValues,
} from './capture';
import type { RelationshipEntity, ProcessEntity, DecisionEntity } from './schema';

const profile = { businessName: 'Fixture Co', ownerName: 'Owner (fictional)' };
const empty = () => createEmptyModel('cap-test', profile);

describe('structured capture - add', () => {
  it('adds an owner-entered relationship: verified, high confidence, owner-sourced, valid', () => {
    const m = addRelationship(empty(), {
      who: 'Valley Brothers', category: 'vendor', whyTheyMatter: 'only steel supplier we trust',
    });
    expect(m.entities.relationships).toHaveLength(1);
    const r = m.entities.relationships[0];
    expect(r.who).toBe('Valley Brothers');
    expect(r.category).toBe('vendor');
    expect(r.verified).toBe(true);
    expect(r.confidence).toBe('high');
    expect(r.sources[0].kind).toBe('interview');
    expect(r.sources[0].detail).toMatch(/entered directly/i);
    expect(validateModel(m)).toEqual([]);
  });

  it('fills unspecified relationship fields with "Not yet captured" and safe enum defaults', () => {
    const r = addRelationship(empty(), { who: 'Someone' }).entities.relationships[0] as RelationshipEntity;
    expect(r.history).toBe('Not yet captured');
    expect(r.whatTheyExpect).toBe('Not yet captured');
    expect(r.category).toBe('other');            // unknown/absent -> other
    expect(r.transferRisk).toBe('medium');
    expect(r.transferPlanStatus).toBe('not-started');
  });

  it('coerces an out-of-range relationship enum to a safe default', () => {
    const r = addRelationship(empty(), { who: 'X', category: 'nonsense', transferRisk: 'critical' })
      .entities.relationships[0] as RelationshipEntity;
    expect(r.category).toBe('other');
    expect(r.transferRisk).toBe('medium');
  });

  it('adds a process with ordered steps and list fields', () => {
    const p = addProcess(empty(), {
      name: 'Quote review', purpose: 'price aerospace work', frequency: 'weekly',
      steps: ['pull the drawings', '  ', 'check tolerances'], whoElseKnows: ['Denise'],
    }).entities.processes[0] as ProcessEntity;
    expect(p.steps).toEqual([
      { order: 1, description: 'pull the drawings' },
      { order: 2, description: 'check tolerances' }, // blank dropped, order re-sequenced
    ]);
    expect(p.whoElseKnows).toEqual(['Denise']);
  });

  it('adds decision, judgment, history, system, commitment - all valid', () => {
    let m = empty();
    m = addDecision(m, { name: 'Pricing', howDecided: 'I sleep on anything over $10k', thresholds: ['$10k'] });
    m = addJudgment(m, { heuristic: 'When a customer haggles on the deposit, they will pay late', context: 'deposits' });
    m = addHistory(m, { whatHappened: 'Lost the Ridgeline account in 2015', when: '2015', whatWasLearned: 'never single-thread a key account' });
    m = addSystem(m, { name: 'QuickBooks', kind: 'software', whatItDoes: 'billing', accessHeldBy: 'Denise' });
    m = addCommitment(m, { withWhom: 'The landlord', whatWasPromised: 'first right of refusal on the back lot', writtenDown: false });
    expect(m.entities.decisions).toHaveLength(1);
    expect(m.entities.judgments).toHaveLength(1);
    expect(m.entities.history).toHaveLength(1);
    expect(m.entities.systems).toHaveLength(1);
    expect(m.entities.commitments).toHaveLength(1);
    expect(m.entities.commitments[0].writtenDown).toBe(false);
    expect(validateModel(m)).toEqual([]);
  });

  it('is pure: adding does not mutate the input model', () => {
    const base = empty();
    addRelationship(base, { who: 'X' });
    expect(base.entities.relationships).toHaveLength(0);
  });
});

describe('structured capture - edit', () => {
  it('patches an entity field and bumps updatedAt without touching protected fields', () => {
    const m = addRelationship(empty(), { who: 'Valley Brothers', whyTheyMatter: 'steel' });
    const r0 = m.entities.relationships[0];
    const m2 = patchEntity(m, r0.id, { whyTheyMatter: 'only steel supplier that hits our tolerances', who: 'Valley Brothers Supply' });
    const r1 = m2.entities.relationships[0];
    expect(r1.whyTheyMatter).toContain('tolerances');
    expect(r1.who).toBe('Valley Brothers Supply');
    expect(r1.id).toBe(r0.id);                       // id preserved
    expect(r1.createdAt).toBe(r0.createdAt);         // createdAt preserved
    expect(r1.updatedAt >= r0.updatedAt).toBe(true); // updatedAt bumped
    expect(validateModel(m2)).toEqual([]);
  });

  it('ignores unknown keys and protected fields', () => {
    const m = addDecision(empty(), { name: 'Pricing' });
    const id = m.entities.decisions[0].id;
    const m2 = patchEntity(m, id, { id: 'hacked', type: 'risk', bogus: 'x', name: 'Pricing rules' } as Record<string, string>);
    expect(m2.entities.decisions[0].id).toBe(id);    // id untouched
    expect(m2.entities.decisions[0].type).toBe('decision');
    expect(m2.entities.decisions[0].name).toBe('Pricing rules');
    expect(validateModel(m2)).toEqual([]);
  });

  it('toggles verified and is attributable', () => {
    const m = addRelationship(empty(), { who: 'X' });
    const id = m.entities.relationships[0].id;
    const m2 = setVerified(m, id, false);
    expect(m2.entities.relationships[0].verified).toBe(false);
    const m3 = setVerified(m2, id, true);
    expect(m3.entities.relationships[0].verified).toBe(true);
  });

  it('throws on an unknown id rather than corrupting the model', () => {
    expect(() => patchEntity(empty(), 'nope', { who: 'x' })).toThrow(/no such entity/i);
    expect(() => setVerified(empty(), 'nope', true)).toThrow(/no such entity/i);
  });
});

describe('structured capture - list-field edit', () => {
  const seededProcess = () => {
    const m = addProcess(empty(), {
      name: 'Quote review', steps: ['pull drawings', 'check tolerances', 'set price'],
      whoElseKnows: ['Denise'],
    });
    return { m, id: m.entities.processes[0].id };
  };
  const seededDecision = () => {
    const m = addDecision(empty(), { name: 'Pricing', realCriteria: ['margin', 'relationship'] });
    return { m, id: m.entities.decisions[0].id };
  };

  it('reads a step list back as plain strings', () => {
    const { m } = seededProcess();
    expect(listFieldValues(m.entities.processes[0], 'steps'))
      .toEqual(['pull drawings', 'check tolerances', 'set price']);
    expect(listFieldValues(m.entities.processes[0], 'nope')).toEqual([]);
  });

  it('appends a step and keeps the order contiguous', () => {
    const { m, id } = seededProcess();
    const m2 = addListItem(m, id, 'steps', '  send the quote  ');
    const p = m2.entities.processes[0] as ProcessEntity;
    expect(p.steps).toEqual([
      { order: 1, description: 'pull drawings' },
      { order: 2, description: 'check tolerances' },
      { order: 3, description: 'set price' },
      { order: 4, description: 'send the quote' }, // trimmed
    ]);
    expect(m2.updatedAt >= m.updatedAt).toBe(true);
  });

  it('removes a middle step and renumbers the rest 1..n', () => {
    const { m, id } = seededProcess();
    const m2 = removeListItem(m, id, 'steps', 1); // drop "check tolerances"
    const p = m2.entities.processes[0] as ProcessEntity;
    expect(p.steps).toEqual([
      { order: 1, description: 'pull drawings' },
      { order: 2, description: 'set price' },
    ]);
  });

  it('edits a step in place', () => {
    const { m, id } = seededProcess();
    const p = (editListItem(m, id, 'steps', 0, 'pull the latest drawings')
      .entities.processes[0]) as ProcessEntity;
    expect(p.steps[0]).toEqual({ order: 1, description: 'pull the latest drawings' });
  });

  it('edits and removes a plain string[] field (decision criteria)', () => {
    const { m, id } = seededDecision();
    let m2 = addListItem(m, id, 'realCriteria', 'payment history');
    m2 = editListItem(m2, id, 'realCriteria', 0, 'gross margin');
    m2 = removeListItem(m2, id, 'realCriteria', 1); // drop "relationship"
    expect((m2.entities.decisions[0] as DecisionEntity).realCriteria)
      .toEqual(['gross margin', 'payment history']);
  });

  it('ignores blank add/edit and out-of-range indices (no-op, no timestamp bump)', () => {
    const { m, id } = seededProcess();
    expect(addListItem(m, id, 'steps', '   ')).toBe(m);
    expect(editListItem(m, id, 'steps', 0, '  ')).toBe(m);
    expect(editListItem(m, id, 'steps', 99, 'x')).toBe(m);
    expect(removeListItem(m, id, 'steps', 99)).toBe(m);
  });

  it('is pure and rejects non-list fields and unknown ids', () => {
    const { m, id } = seededProcess();
    addListItem(m, id, 'steps', 'x');
    expect(m.entities.processes[0].steps).toHaveLength(3); // input untouched
    expect(() => addListItem(m, id, 'purpose', 'x')).toThrow(/not an editable list field/i);
    expect(() => addListItem(m, 'nope', 'steps', 'x')).toThrow(/no such entity/i);
  });
});

/**
 * P1 (2026-07-16). Provenance depends on who is typing. Before this, everything
 * capture.ts created claimed source detail "Entered directly by the owner" and
 * verified=true - so an advisor running the interview as a service produced
 * entities that falsely claimed the owner had entered and confirmed them.
 * See DECISIONS.md 2026-07-16.
 */
describe('P1: attribution', () => {
  const base = () => createEmptyModel('p1', { businessName: 'B', ownerName: 'O' });

  it('owner entry is unchanged: interview source, high, verified', () => {
    const m = addCommitment(base(), { withWhom: 'Henderson', whatWasPromised: 'free freight' });
    const c = m.entities.commitments[0];
    expect(c.sources[0].kind).toBe('interview');
    expect(c.sources[0].detail).toBe('Entered directly by the owner');
    expect(c.confidence).toBe('high');
    expect(c.verified).toBe(true);
  });

  it('defaults to owner when no attribution is given (Stage-2 behaviour)', () => {
    const m = addProcess(base(), { name: 'Payroll' });
    expect(m.entities.processes[0].verified).toBe(true);
    expect(m.entities.processes[0].sources[0].kind).toBe('interview');
  });

  it('operator entry is inferred, medium, UNVERIFIED, and names who + source', () => {
    const m = addCommitment(base(), { withWhom: 'Henderson', whatWasPromised: 'free freight' },
      { enteredBy: 'operator', operatorName: 'J. Smith', structuredFrom: 'fact_abc (Track 3, answer 4)' });
    const c = m.entities.commitments[0];
    expect(c.sources[0].kind).toBe('inferred');
    expect(c.sources[0].detail).toBe(
      'Structured by J. Smith from fact_abc (Track 3, answer 4) - not yet confirmed by the owner');
    expect(c.confidence).toBe('medium');
    expect(c.verified).toBe(false);
    // Never claims the owner did it:
    expect(c.sources[0].detail).not.toContain('Entered directly by the owner');
  });

  it('an operator entry never claims owner authorship, across all seven types', () => {
    const by = { enteredBy: 'operator' as const, operatorName: 'J. Smith' };
    let m = base();
    m = addRelationship(m, { who: 'A' }, by);
    m = addDecision(m, { name: 'B' }, by);
    m = addProcess(m, { name: 'C' }, by);
    m = addJudgment(m, { heuristic: 'D' }, by);
    m = addHistory(m, { whatHappened: 'E' }, by);
    m = addSystem(m, { name: 'F' }, by);
    m = addCommitment(m, { withWhom: 'G' }, by);
    const all = [
      ...m.entities.relationships, ...m.entities.decisions, ...m.entities.processes,
      ...m.entities.judgments, ...m.entities.history, ...m.entities.systems, ...m.entities.commitments,
    ];
    expect(all.length).toBe(7);
    for (const e of all) {
      expect(e.verified).toBe(false);
      expect(e.sources[0].kind).toBe('inferred');
      expect(e.sources[0].detail).toContain('Structured by J. Smith');
    }
    expect(validateModel(m)).toEqual([]);
  });

  it('falls back to "the operator" when no name is given', () => {
    const m = addSystem(base(), { name: 'QuickBooks' }, { enteredBy: 'operator' });
    expect(m.entities.systems[0].sources[0].detail)
      .toBe('Structured by the operator - not yet confirmed by the owner');
  });

  it('the owner can promote an operator entry via setVerified', () => {
    let m = addCommitment(base(), { withWhom: 'Henderson' }, { enteredBy: 'operator', operatorName: 'J' });
    const id = m.entities.commitments[0].id;
    expect(m.entities.commitments[0].verified).toBe(false);
    m = setVerified(m, id, true);
    expect(m.entities.commitments[0].verified).toBe(true);
  });
});
