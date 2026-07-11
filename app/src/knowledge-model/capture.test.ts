import { describe, it, expect } from 'vitest';
import { createEmptyModel, validateModel } from './model';
import {
  addRelationship, addDecision, addProcess, addJudgment,
  addHistory, addSystem, addCommitment, patchEntity, setVerified,
} from './capture';
import type { RelationshipEntity, ProcessEntity } from './schema';

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
