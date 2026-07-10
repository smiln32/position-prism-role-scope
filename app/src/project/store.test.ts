import { describe, it, expect } from 'vitest';
import {
  ProjectStore,
  startSession,
  resumeSession,
  endSession,
  PROJECT_FORMAT_VERSION,
  type ProjectFile,
  type StorageLike,
} from './store';
import { createEmptyModel } from '../knowledge-model/model';
import { fixtureModel } from '../knowledge-model/fixture';

/** In-memory Storage backend for tests - simulates localStorage exactly. */
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

function newProject(): ProjectFile {
  return {
    formatVersion: PROJECT_FORMAT_VERSION,
    model: createEmptyModel('walkthrough-1', {
      businessName: 'Walkthrough Co (fixture)',
      ownerName: 'Walkthrough Owner (fixture)',
      industry: 'Testing',
      employeeCount: '10',
      plannedExitWindow: '5 years',
    }),
    sessions: [],
  };
}

describe('Stage 2 acceptance: create, close, resume - lossless', () => {
  it('full walkthrough survives total loss of in-memory state', () => {
    // The storage device persists; everything else will be discarded.
    const disk = fakeStorage();

    // --- Session A: the user creates a project and starts a session ---
    {
      const store = new ProjectStore(disk);
      let project = newProject();
      const started = startSession(project, 'First sitting');
      project = started.project;
      store.save(project);
    }
    // <-- app "closed": all in-memory objects above are now out of scope.

    // --- Session B: fresh app instance resumes from storage ---
    const store2 = new ProjectStore(disk);
    const listed = store2.list();
    expect(listed.length).toBe(1);
    expect(listed[0].businessName).toBe('Walkthrough Co (fixture)');
    expect(listed[0].sessionCount).toBe(1);

    let resumed = store2.load('walkthrough-1');
    expect(resumed.model.profile.ownerName).toBe('Walkthrough Owner (fixture)');
    expect(resumed.sessions[0].label).toBe('First sitting');
    expect(resumed.sessions[0].status).toBe('active');

    // Resume the session, end it, save, and prove byte-level round-trip.
    resumed = resumeSession(resumed, resumed.sessions[0].id);
    resumed = endSession(resumed, resumed.sessions[0].id);
    store2.save(resumed);

    const raw1 = store2.exportJson('walkthrough-1');
    const store3 = new ProjectStore(disk);
    const raw2 = store3.exportJson('walkthrough-1');
    expect(raw2).toBe(raw1); // lossless
    expect(store3.load('walkthrough-1').sessions[0].status).toBe('ended');
  });

  it('export/import round-trips a project with a populated model', () => {
    const disk = fakeStorage();
    const store = new ProjectStore(disk);
    const project: ProjectFile = {
      formatVersion: PROJECT_FORMAT_VERSION,
      model: fixtureModel,
      sessions: [],
    };
    store.save(project);
    const json = store.exportJson(fixtureModel.projectId);

    const disk2 = fakeStorage();
    const store2 = new ProjectStore(disk2);
    const imported = store2.importJson(json);
    expect(imported).toEqual(project);
    expect(store2.exportJson(fixtureModel.projectId)).toBe(json);
  });

  it('refuses to save or import an invalid project', () => {
    const store = new ProjectStore(fakeStorage());
    const bad = { formatVersion: '0.1', sessions: [], model: {} } as unknown as ProjectFile;
    expect(() => store.save(bad)).toThrow('invalid project');
    expect(() => store.importJson('{"formatVersion":"1.0.0"}')).toThrow('failed validation');
    expect(() => store.importJson('nope')).toThrow('not valid JSON');
  });

  it('load of a missing project fails loudly, never returns a fabricated one', () => {
    const store = new ProjectStore(fakeStorage());
    expect(() => store.load('ghost')).toThrow('No saved project');
  });
});
