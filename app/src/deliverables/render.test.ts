import { describe, it, expect } from 'vitest';
import {
  DELIVERABLES, renderPackage, renderDeliverable, auditRendered,
  DISCLAIMER, NOT_CAPTURED,
} from './render';
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
