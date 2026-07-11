import { describe, it, expect } from 'vitest';
import {
  ProjectStore, startSession, endSession, migrateProject,
  PROJECT_FORMAT_VERSION, type ProjectFile, type StorageLike,
} from '../src/project/store';
import { createEmptyModel, exportModel, importModel, validateModel, newId } from '../src/knowledge-model/model';
import { RuleBasedEngine, TRACKS } from '../src/interview/engine';
import { analyzeDocument, listOpenConflicts, resolveConflict } from '../src/analysis/extract';
import { renderPackage, auditRendered, DISCLAIMER, NOT_CAPTURED } from '../src/deliverables/render';
import { computeMetrics, resolveGap } from '../src/dashboard/metrics';
import { COLLECTION_KEYS } from '../src/knowledge-model/schema';

/**
 * STAGE 8 - THE ACCEPTANCE RUN
 *
 * One uninterrupted pass through the whole product, exactly as the spec's
 * Definition of Done requires: new project -> interviews (multiple
 * sessions, multiple tracks, follow-ups, a contradiction) -> documents
 * (with a surfaced and resolved conflict) -> dashboard reconciliation ->
 * the full nine-document package with zero invented content -> lossless,
 * schema-valid export. No manual intervention anywhere. Fixture data.
 */

function fakeStorage(): StorageLike {
  const m = new Map<string, string>();
  return {
    getItem: (k) => (m.has(k) ? m.get(k)! : null),
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
    key: (i) => Array.from(m.keys())[i] ?? null,
    get length() { return m.size; },
  };
}

describe('STAGE 8: single uninterrupted acceptance run', () => {
  it('new project -> interviews -> documents -> full package, no manual intervention', () => {
    const disk = fakeStorage();
    const engine = new RuleBasedEngine();

    // ---------- 1. NEW PROJECT ----------
    {
      const store = new ProjectStore(disk);
      const project: ProjectFile = {
        formatVersion: PROJECT_FORMAT_VERSION,
        model: createEmptyModel(newId('proj'), {
          businessName: 'Hartwell Machine & Tool (FIXTURE - not a real company)',
          ownerName: 'Ray Hartwell (fictional)',
          industry: 'Precision machining',
          employeeCount: '22',
          plannedExitWindow: '3-5 years',
        }),
        sessions: [],
      };
      store.save(project);
    }
    // App "closes" - all in-memory state above is gone.

    // ---------- 2. INTERVIEW SESSION 1 (Track 1) ----------
    const store = new ProjectStore(disk);
    const projectId = store.list()[0].projectId;
    let project = store.load(projectId);
    {
      const s = startSession(project, 'First sitting');
      project = s.project;
      let memory = project.interviewMemory ?? engine.createMemory();
      const answers = [
        'I get in at 6:30, walk the floor, and go over the schedule with Denise before the crew arrives.',
        'She is our office manager, nineteen years with us, and she runs billing and payroll.',
        'Every Friday I do the quote review myself. Only I know how to price the aerospace work.',
        'Honestly it would take a year working beside me, but our lead machinist has the feel for it.',
        'The line of credit renews every March with the downtown branch and they like a call first.',
      ];
      for (const a of answers) {
        const r = engine.ingestAnswer(memory, project.model, s.session.id, 'track-1', a);
        memory = r.memory;
        project = { ...project, model: r.model, interviewMemory: memory };
      }
      project = endSession(project, s.session.id);
      store.save(project);
    }

    // ---------- 3. INTERVIEW SESSION 2 (Tracks 7 and 8, days later) ----------
    project = store.load(projectId);
    {
      const s = startSession(project, 'Second sitting');
      project = s.project;
      let memory = project.interviewMemory!;
      for (const [track, a] of [
        ['track-7', 'Losing the aerospace pricing knowledge worries me most because nobody else has it.'],
        ['track-8', 'Call the bank first, then the two biggest customers, in that order, in the first week.'],
        ['track-8', 'They should change nothing at all for ninety days except learning names and walking the floor.'],
      ] as const) {
        const r = engine.ingestAnswer(memory, project.model, s.session.id, track, a);
        memory = r.memory;
        project = { ...project, model: r.model, interviewMemory: memory };
      }
      project = endSession(project, s.session.id);
      store.save(project);
    }
    // Cross-session memory worked: threads from session 1 survived into memory.
    expect(project.model.entities.risks.length).toBeGreaterThanOrEqual(2);
    expect(project.interviewMemory!.pendingThreads.length).toBeGreaterThan(0);

    // ---------- 4. DOCUMENT (conflicts with the interview) ----------
    project = store.load(projectId);
    {
      const doc = {
        id: newId('doc'), name: 'vendor-list.txt', addedAt: new Date().toISOString(),
        text: [
          'Vendor list - Hartwell Machine & Tool (FIXTURE)',
          'Steel: Valley Brothers Supply, net 30',
          'Bank line of credit renews every September with the downtown branch',
        ].join('\n'),
      };
      const result = analyzeDocument(project.model, project.interviewMemory!.knownNames, doc);
      project = {
        ...project,
        model: result.model,
        interviewMemory: { ...project.interviewMemory!, knownNames: result.knownNames },
        documents: [...(project.documents ?? []), doc],
      };
      store.save(project);
      expect(result.report.factsAdded).toBe(3);
      expect(result.report.conflicts).toBe(1);
    }

    // ---------- 5. CONFLICT RESOLVED (owner picks the document) ----------
    project = store.load(projectId);
    {
      const [conflict] = listOpenConflicts(project.model);
      expect(conflict.interviewStatement).toContain('March');
      expect(conflict.documentStatement).toContain('September');
      project = { ...project, model: resolveConflict(project.model, conflict.gapId, 'document') };
      store.save(project);
      expect(listOpenConflicts(project.model).length).toBe(0);
    }

    // ---------- 6. DASHBOARD RECONCILES EXACTLY ----------
    project = store.load(projectId);
    {
      const m = computeMetrics(project);
      const raw = JSON.parse(JSON.stringify(project.model));
      const rawE = COLLECTION_KEYS.flatMap((k: string) => raw.entities[k]);
      expect(m.verification.total).toBe(rawE.length);
      expect(m.gaps.total).toBe(raw.entities.gaps.length);
      expect(m.gaps.resolved).toBe(
        raw.entities.gaps.filter((g: { status: string }) => g.status === 'resolved').length);
      expect(m.risks.count).toBe(raw.entities.risks.length);
      expect(m.completeness.totalAreas).toBe(50);
      expect(m.completeness.coveredAreas).toBe(
        TRACKS.reduce((n, t) => n + (project.interviewMemory!.trackProgress[t.id]?.answeredAreas.length ?? 0), 0));
      // Owner clears one open question from the dashboard:
      const open = project.model.entities.gaps.find((g) => g.status !== 'resolved')!;
      project = { ...project, model: resolveGap(project.model, open.id) };
      store.save(project);
    }

    // ---------- 7. THE PACKAGE: nine documents, zero invention ----------
    project = store.load(projectId);
    {
      const { rendered, versions } = renderPackage(project);
      expect(rendered.length).toBe(9);
      for (const d of rendered) {
        expect(auditRendered(d, project.model),
          `${d.title} failed the zero-invention audit`).toEqual([]);
        expect(d.markdown).toContain(DISCLAIMER);
        expect(d.markdown).toContain('Version 1');
      }
      const handbook = rendered.find((d) => d.id === 'handbook')!;
      expect(handbook.markdown).toContain('go over the schedule with Denise');
      const riskReport = rendered.find((d) => d.id === 'risk-report')!;
      expect(riskReport.markdown).toMatch(/\d+ \((high|medium|low)\)/);
      const firstYear = rendered.find((d) => d.id === 'first-year')!;
      expect(firstYear.markdown).toContain(NOT_CAPTURED); // honest empty months
      project = { ...project, deliverableVersions: versions };
      store.save(project);
    }

    // ---------- 8. LOSSLESS, SCHEMA-VALID EXPORT ----------
    project = store.load(projectId);
    {
      const json = exportModel(project.model);
      const back = importModel(json);
      expect(validateModel(back)).toEqual([]);
      expect(exportModel(back)).toBe(json);
      // Whole-project export/import round-trip too:
      const projectJson = store.exportJson(projectId);
      const disk2 = fakeStorage();
      const store2 = new ProjectStore(disk2);
      const restored = store2.importJson(projectJson);
      expect(migrateProject(restored)).toEqual(restored); // nothing legacy left
      expect(store2.exportJson(projectId)).toBe(projectJson);
    }

    // ---------- DEFINITION OF DONE, checked in one breath ----------
    expect(validateModel(project.model)).toEqual([]);          // frozen contract holds
    expect(project.model.schemaVersion).toBe('1.0.0');          // still v1.0.0
    expect(project.sessions.every((s) => s.status === 'ended')).toBe(true);
  });
});
