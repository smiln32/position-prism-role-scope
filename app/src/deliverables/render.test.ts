import { describe, it, expect } from 'vitest';
import {
  DELIVERABLES, renderPackage, renderDeliverable, auditRendered,
  DISCLAIMER, NOT_CAPTURED, NOT_ASKED, factsMentioningMonth,
} from './render';
import { analyzeDocument } from '../analysis/extract';
import type { FactEntity } from '../knowledge-model/schema';
import { fixtureModel } from '../knowledge-model/fixture';
import { createEmptyModel } from '../knowledge-model/model';
import { RuleBasedEngine } from '../interview/engine';
import { PROJECT_FORMAT_VERSION, type ProjectFile } from '../project/store';

/**
 * Stage 6 acceptance: every deliverable generates from the fixture model
 * with zero invented content (audited line-by-line, automated) and real
 * formatting. Fixture data throughout.
 */

function fixtureProject(): ProjectFile {
  // The Stage 1 fixture model plus interview facts, so both sources render.
  const engine = new RuleBasedEngine();
  let memory = engine.createMemory();
  let model = JSON.parse(JSON.stringify(fixtureModel));
  let r = engine.ingestAnswer(memory, model, 'sess_fix', 'track-1',
    'I get in at 6:30, walk the floor, and check every machine that ran overnight before the crew arrives.');
  memory = r.memory; model = r.model;
  r = engine.ingestAnswer(memory, model, 'sess_fix', 'track-8',
    'Call the bank first, then the two biggest customers, in that order, in the first week.');
  memory = r.memory; model = r.model;
  r = engine.ingestAnswer(memory, model, 'sess_fix2', 'track-1',
    'Insurance renews every March and the big customer audits land in the fall.');
  memory = r.memory; model = r.model;
  return {
    formatVersion: PROJECT_FORMAT_VERSION,
    model,
    sessions: [],
    interviewMemory: memory,
  };
}

describe('Stage 6 acceptance: deliverable generation', () => {
  it('all nine deliverables generate, each carrying the disclaimer and version', () => {
    const project = fixtureProject();
    const { rendered } = renderPackage(project);
    expect(rendered.length).toBe(9);
    expect(new Set(rendered.map((d) => d.id)).size).toBe(9);
    for (const d of rendered) {
      expect(d.markdown.length).toBeGreaterThan(200);
      expect(d.markdown).toContain(DISCLAIMER);
      expect(d.markdown).toContain('Version 1');
      expect(d.markdown).toContain(project.model.profile.businessName);
    }
  });

  it('ZERO-INVENTION AUDIT: every model-derived string in every deliverable exists verbatim in the model', () => {
    const project = fixtureProject();
    const { rendered } = renderPackage(project);
    for (const d of rendered) {
      const violations = auditRendered(d, project.model);
      expect(violations, `${d.title} emitted content not present in the model: ${JSON.stringify(violations)}`).toEqual([]);
      // The audit has teeth: substantial documents registered real content.
      if (d.id !== 'ai-export') expect(d.content.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('the audit itself catches invented content', () => {
    const project = fixtureProject();
    const [d] = renderPackage(project).rendered;
    const tampered = { ...d, content: [...d.content, 'This sentence was never said by anyone.'] };
    expect(auditRendered(tampered, project.model)).toEqual(['This sentence was never said by anyone.']);
  });

  it('empty model: deliverables say "Not yet captured" and invent nothing', () => {
    const project: ProjectFile = {
      formatVersion: PROJECT_FORMAT_VERSION,
      model: createEmptyModel('s6-empty', {
        businessName: 'Empty Co (FIXTURE)', ownerName: 'No One (fixture)',
      }),
      sessions: [],
    };
    const { rendered } = renderPackage(project);
    for (const d of rendered) {
      expect(auditRendered(d, project.model)).toEqual([]);
      if (['handbook', 'relationship-map', 'first-year', 'memory-archive', 'emergency-brief'].includes(d.id)) {
        expect(d.markdown).toContain(NOT_CAPTURED);
      }
    }
  });

  it('needs-verification and low-confidence markers render', () => {
    const project = fixtureProject();
    const { rendered } = renderPackage(project);
    const handbook = rendered.find((d) => d.id === 'handbook')!;
    expect(handbook.markdown).toContain('(needs verification)');
    // Demote one fact and confirm the marker compounds:
    project.model.entities.facts[1].confidence = 'low';
    const again = renderDeliverable(DELIVERABLES[1], project, 2);
    expect(again.markdown).toContain('low confidence');
  });

  it('verified items carry no marker', () => {
    const project = fixtureProject();
    const { rendered } = renderPackage(project);
    const handbook = rendered.find((d) => d.id === 'handbook')!;
    // fact_0001 in the fixture is verified: its quote line has no marker.
    const line = handbook.markdown.split('\n').find((l) =>
      l.includes('Ray personally opens the shop'))!;
    expect(line).not.toContain('needs verification');
  });

  it('versions increment per generation and persist on the project', () => {
    const project = fixtureProject();
    const first = renderPackage(project);
    expect(first.rendered[0].version).toBe(1);
    const updated: ProjectFile = { ...project, deliverableVersions: first.versions };
    const second = renderPackage(updated);
    expect(second.rendered[0].version).toBe(2);
    expect(second.rendered.every((d) => d.version === 2)).toBe(true);
  });

  it('specific renderings: relationships, decisions, systems, months, risks all pull real fields', () => {
    const project = fixtureProject();
    const { rendered } = renderPackage(project);
    const byId = Object.fromEntries(rendered.map((d) => [d.id, d.markdown]));

    expect(byId['relationship-map']).toContain('Tom Vasquez, Apex Aerospace purchasing');
    expect(byId['relationship-map']).toContain('Transfer risk: high');
    expect(byId['decision-playbook']).toContain('Taking on a new customer');
    expect(byId['decision-playbook']).toContain('Any first order over $25k requires 50% deposit');
    expect(byId['emergency-brief']).toContain('Admin login held by Ray and Denise');
    expect(byId['emergency-brief']).toContain('No passwords or account numbers are stored');
    // "Insurance renewal in March" from the fixture lands under March:
    const firstYear = byId['first-year'];
    expect(firstYear.indexOf('Insurance renews every March'))
      .toBeGreaterThan(firstYear.indexOf('### March'));
    expect(byId['risk-report']).toContain('single point of failure');
    expect(byId['risk-report']).toContain('What is "the Meridian situation"');
    expect(byId['ai-export']).toContain('"schemaVersion": "1.0.0"');
  });
});

/**
 * P3 (2026-07-16). "First Year Without the Founder" filed facts onto the
 * calendar with a case-insensitive substring match, so every statement
 * containing the modal verb "may" landed under May. Three month names are also
 * ordinary words; those are matched case-sensitively now.
 * See DECISIONS.md 2026-07-16.
 */
describe('P3: month matching on the calendar', () => {
  const fact = (statement: string): FactEntity => ({
    id: 'fact_' + statement.slice(0, 6), type: 'fact', confidence: 'high',
    sources: [{ kind: 'interview', capturedAt: '2026-01-01T00:00:00.000Z' }],
    createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    verified: false, statement,
  });

  it('does not file the modal verb "may" under May', () => {
    const facts = [fact('We may need to order steel early if the mill is behind.')];
    expect(factsMentioningMonth(facts, 'May')).toEqual([]);
  });

  it('still files a real May mention under May', () => {
    const facts = [fact('The shop closes the last week of May every year.')];
    expect(factsMentioningMonth(facts, 'May').length).toBe(1);
  });

  it('does not file "march" the verb, or "august" the adjective', () => {
    expect(factsMentioningMonth([fact('Do not march into that negotiation cold.')], 'March')).toEqual([]);
    expect(factsMentioningMonth([fact('It is an august old firm with deep pockets.')], 'August')).toEqual([]);
    expect(factsMentioningMonth([fact('Inventory count happens in March.')], 'March').length).toBe(1);
  });

  it('unambiguous months stay case-insensitive', () => {
    expect(factsMentioningMonth([fact('we shut down in january for two weeks')], 'January').length).toBe(1);
  });

  it('respects word boundaries', () => {
    expect(factsMentioningMonth([fact('Our Mayfair account is the biggest.')], 'May')).toEqual([]);
    expect(factsMentioningMonth([fact('The Augusta job runs long.')], 'August')).toEqual([]);
  });
});

/**
 * P6 + P7 (2026-07-16). P7: a deliberately scoped engagement used to print
 * "Not yet captured" across every part the interview never reached, so focused
 * work read as failed work. P6: document lines rendered as one blockquote each,
 * so a long SOP buried the interview knowledge. See DECISIONS.md 2026-07-16.
 */
describe('P6/P7: scope-aware sections and compact document rendering', () => {
  const emptyProject = (): ProjectFile => ({
    formatVersion: '1.0.0',
    model: createEmptyModel('p7', { businessName: 'Fixture Co', ownerName: 'Owner' }),
    sessions: [],
  });

  it('a never-interviewed project says "not asked", not "not captured"', () => {
    const rendered = renderDeliverable(DELIVERABLES.find((d) => d.id === 'handbook')!, emptyProject(), 1);
    expect(rendered.markdown).toContain(NOT_ASKED);
    // The entity-backed sections keep their own honest label:
    expect(rendered.markdown).toContain(NOT_CAPTURED);
  });

  it('an asked-but-empty area still says "not yet captured"', () => {
    const project = emptyProject();
    // change-slowly was reached (marked answered), never produced a fact:
    project.interviewMemory = {
      trackProgress: { 'track-8': { answeredAreas: ['change-slowly'] } },
      pendingThreads: [], knownNames: [], answerCount: 1,
    };
    const rendered = renderDeliverable(DELIVERABLES.find((d) => d.id === 'first-year')!, project, 1);
    const changeSlowly = rendered.markdown.split('## What to change slowly')[1].split('##')[0];
    const neverChange = rendered.markdown.split('## What should never change')[1].split('##')[0];
    expect(changeSlowly).toContain(NOT_CAPTURED); // asked, nothing recorded
    expect(neverChange).toContain(NOT_ASKED);     // never reached
  });

  it('document lines render grouped under their document, as bullets not blockquotes', () => {
    const project = emptyProject();
    project.documents = [{ id: 'doc_1', name: 'opening-procedure.txt', addedAt: 'now', text: '' }];
    const analyzed = analyzeDocument(project.model, [], {
      id: 'doc_1', name: 'opening-procedure.txt', addedAt: 'now',
      text: 'Unlock at six and start the compressors.\nWalk the floor before the crew arrives.',
    });
    project.model = analyzed.model;
    const rendered = renderDeliverable(DELIVERABLES.find((d) => d.id === 'handbook')!, project, 1);
    expect(rendered.markdown).toContain('### opening-procedure.txt');
    expect(rendered.markdown).toContain('- Unlock at six and start the compressors.');
    expect(rendered.markdown).not.toContain('> Unlock at six');
    // The zero-invention audit still holds over the new shape:
    expect(auditRendered(rendered, project.model)).toEqual([]);
  });
});
