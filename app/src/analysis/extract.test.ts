import { describe, it, expect } from 'vitest';
import { analyzeDocument, isConflict, listOpenConflicts, resolveConflict } from './extract';
import { RuleBasedEngine } from '../interview/engine';
import { createEmptyModel, validateModel, entityCount } from '../knowledge-model/model';

/**
 * Stage 5 acceptance: a fixture document set produces correct extractions
 * and at least one surfaced conflict handled end to end. Fixture data.
 */

const VENDOR_LIST = [
  'Vendor list - Hartwell Machine & Tool (FIXTURE)',
  'Steel: Valley Brothers Supply, net 30, contact Ed Kowalski',
  'Tooling: Precision Carbide, net 45',
  'Bank line of credit renews every September with the downtown branch',
].join('\n');

const OLD_SOP = [
  'Opening procedure (old notes)',
  'Unlock at 6:00 and start the compressors before anything else',
  'Coffee for the morning crew is on whoever loses the Friday bet',
].join('\n');

function seededModel() {
  const engine = new RuleBasedEngine();
  let memory = engine.createMemory();
  let model = createEmptyModel('s5-accept', {
    businessName: 'Hartwell Machine & Tool (FIXTURE)', ownerName: 'Ray (fictional)',
  });
  // Interview knowledge that the vendor list will contradict (March vs September):
  let r = engine.ingestAnswer(memory, model, 'sess_1', 'track-3',
    'Our steel comes from two brothers over in the valley and that relationship goes back thirty years.');
  memory = r.memory; model = r.model;
  r = engine.ingestAnswer(memory, model, 'sess_1', 'track-3',
    'We bank with the downtown branch and our line of credit renews every March without much conversation.');
  memory = r.memory; model = r.model;
  return { model, knownNames: memory.knownNames };
}

describe('Stage 5 acceptance: document analysis', () => {
  it('extracts every line verbatim with document attribution; names become gaps', () => {
    const { model, knownNames } = seededModel();
    const before = entityCount(model);
    const doc = { id: 'doc_vendors', name: 'vendor-list.txt', addedAt: 'now', text: VENDOR_LIST };
    const result = analyzeDocument(model, knownNames, doc);

    expect(result.report.factsAdded).toBe(4);
    // Every extracted fact is a verbatim line, attributed to the document:
    const docFacts = result.model.entities.facts.filter(
      (f) => f.sources[0].kind === 'document' && f.sources[0].documentId === 'doc_vendors');
    expect(docFacts.length).toBe(4);
    const lines = VENDOR_LIST.split('\n');
    for (const f of docFacts) expect(lines).toContain(f.statement);
    expect(docFacts[1].sources[0].detail).toBe('vendor-list.txt, line 2');
    // "Ed" / "Kowalski" style names surfaced as gaps:
    expect(result.report.nameGaps).toBeGreaterThan(0);
    expect(result.model.entities.gaps.some((g) => g.question.includes('"Ed"') || g.question.includes('"Kowalski"'))).toBe(true);
    expect(validateModel(result.model)).toEqual([]);
    expect(entityCount(result.model)).toBeGreaterThan(before);
  });

  it('SURFACED CONFLICT: document says September, owner said March', () => {
    const { model, knownNames } = seededModel();
    const doc = { id: 'doc_vendors', name: 'vendor-list.txt', addedAt: 'now', text: VENDOR_LIST };
    const result = analyzeDocument(model, knownNames, doc);

    expect(result.report.conflicts).toBe(1);
    const conflicts = listOpenConflicts(result.model);
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].interviewStatement).toContain('renews every March');
    expect(conflicts[0].documentStatement).toContain('renews every September');
    // The gap quotes both sides verbatim and asks:
    const gap = result.model.entities.gaps.find((g) => g.id === conflicts[0].gapId)!;
    expect(gap.question).toContain(conflicts[0].documentStatement);
    expect(gap.question).toContain(conflicts[0].interviewStatement);
    expect(gap.question).toContain('Which is right');
  });

  it('RESOLUTION: owner picks the document; nothing is deleted', () => {
    const { model, knownNames } = seededModel();
    const doc = { id: 'doc_vendors', name: 'vendor-list.txt', addedAt: 'now', text: VENDOR_LIST };
    const result = analyzeDocument(model, knownNames, doc);
    const [conflict] = listOpenConflicts(result.model);

    const resolved = resolveConflict(result.model, conflict.gapId, 'document');

    const docFact = resolved.entities.facts.find((f) => f.statement === conflict.documentStatement)!;
    const intFact = resolved.entities.facts.find((f) => f.statement === conflict.interviewStatement)!;
    expect(docFact.verified).toBe(true);
    expect(intFact.verified).toBe(false);
    expect(intFact.confidence).toBe('low');
    // Both facts still exist - never deleted:
    expect(docFact).toBeDefined();
    expect(intFact).toBeDefined();
    expect(resolved.entities.gaps.find((g) => g.id === conflict.gapId)!.status).toBe('resolved');
    expect(listOpenConflicts(resolved).length).toBe(0);
    expect(validateModel(resolved)).toEqual([]);
  });

  it('resolution choice "interview" and "both" behave as ruled', () => {
    const { model, knownNames } = seededModel();
    const doc = { id: 'd', name: 'vendor-list.txt', addedAt: 'now', text: VENDOR_LIST };
    const analyzed = analyzeDocument(model, knownNames, doc);
    const [c] = listOpenConflicts(analyzed.model);

    const keepMine = resolveConflict(analyzed.model, c.gapId, 'interview');
    expect(keepMine.entities.facts.find((f) => f.statement === c.interviewStatement)!.verified).toBe(true);
    expect(keepMine.entities.facts.find((f) => f.statement === c.documentStatement)!.confidence).toBe('low');

    const bothTrue = resolveConflict(analyzed.model, c.gapId, 'both');
    expect(bothTrue.entities.facts.find((f) => f.statement === c.interviewStatement)!.verified).toBe(true);
    expect(bothTrue.entities.facts.find((f) => f.statement === c.documentStatement)!.verified).toBe(true);
  });

  it('a second, unrelated document raises no false conflicts', () => {
    const { model, knownNames } = seededModel();
    const doc = { id: 'doc_sop', name: 'old-sop.txt', addedAt: 'now', text: OLD_SOP };
    const result = analyzeDocument(model, knownNames, doc);
    expect(result.report.conflicts).toBe(0);
    expect(result.report.factsAdded).toBe(3);
  });

  it('conflict rule is deterministic and conservative', () => {
    // Same subject, different months -> conflict:
    expect(isConflict(
      'Bank line of credit renews every September with the downtown branch',
      'We bank with the downtown branch and our line of credit renews every March without much conversation.',
    )).toBe(true);
    // Different subjects, both with months -> no conflict (overlap too small):
    expect(isConflict(
      'Insurance renewal falls in September each year',
      'We close the shop for the July holiday week.',
    )).toBe(false);
    // Same subject, same month -> no conflict:
    expect(isConflict(
      'Line of credit renews in March with the downtown branch',
      'We bank with the downtown branch and our line of credit renews every March.',
    )).toBe(false);
    // Same subject, differing numbers -> conflict:
    expect(isConflict(
      'Steel supplier relationship with the valley brothers goes back 12 years',
      'Our steel comes from two brothers over in the valley and that relationship goes back 30 years.',
    )).toBe(true);
  });

  it('respects the line cap and reports skipped lines', () => {
    const big = Array.from({ length: 520 }, (_, i) => `Inventory item number ${i + 1} lives on the back shelf`).join('\n');
    const { model, knownNames } = seededModel();
    const result = analyzeDocument(model, knownNames, { id: 'd2', name: 'big.txt', addedAt: 'now', text: big });
    expect(result.report.factsAdded).toBe(500);
    expect(result.report.linesSkipped).toBe(20);
  });
});
