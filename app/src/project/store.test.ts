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

describe('durability: backup, recovery, and quota handling', () => {
  const KEY = 'successor:project:walkthrough-1';
  const BACKUP = 'successor:project-backup:walkthrough-1';

  it('recovers the last good save when the primary is corrupted', () => {
    const disk = fakeStorage();
    const store = new ProjectStore(disk);
    // First good save (no backup yet), then a second save that establishes a backup.
    store.save(newProject());
    let p = newProject();
    p = startSession(p, 'Second sitting').project;
    store.save(p); // primary = v2, backup = v1

    // A corrupting write to the primary (partial flush, tampering, …).
    disk.setItem(KEY, '{ this is not valid json');
    expect(disk.getItem(BACKUP)).not.toBeNull();

    // load() transparently recovers the last good state from the backup.
    const recovered = store.load('walkthrough-1');
    expect(recovered.model.profile.businessName).toBe('Walkthrough Co (fixture)');
    expect(recovered.sessions).toHaveLength(0); // v1, the last state the backup held
  });

  it('never writes a corrupt value into the backup slot', () => {
    const disk = fakeStorage();
    const store = new ProjectStore(disk);
    store.save(newProject());            // v1 -> primary
    disk.setItem(KEY, 'garbage');        // primary corrupted before next save
    const p = startSession(newProject(), 'x').project;
    store.save(p);                       // v2 -> primary; backup must NOT become "garbage"
    expect(disk.getItem(BACKUP)).toBeNull(); // corrupt current was not backed up
    expect(store.load('walkthrough-1').sessions).toHaveLength(1); // primary is the good v2
  });

  it('surfaces a clear, recoverable error when storage is full', () => {
    const disk = fakeStorage();
    const store = new ProjectStore(disk);
    store.save(newProject());
    // Simulate a full quota on the next primary write.
    const realSet = disk.setItem;
    disk.setItem = (k: string, v: string) => {
      if (k === KEY) throw new DOMException('full', 'QuotaExceededError');
      realSet(k, v);
    };
    expect(() => store.save(startSession(newProject(), 'x').project)).toThrow(/may be full/i);
    // The prior good primary is untouched - nothing was lost.
    disk.setItem = realSet;
    expect(store.load('walkthrough-1').sessions).toHaveLength(0);
  });

  it('remove() clears the backup so a deleted project cannot resurrect', () => {
    const disk = fakeStorage();
    const store = new ProjectStore(disk);
    store.save(newProject());
    store.save(startSession(newProject(), 'x').project); // creates a backup
    expect(disk.getItem(BACKUP)).not.toBeNull();

    store.remove('walkthrough-1');
    expect(disk.getItem(KEY)).toBeNull();
    expect(disk.getItem(BACKUP)).toBeNull();
    expect(() => store.load('walkthrough-1')).toThrow('No saved project');
  });

  it('list() ignores backup entries (no phantom duplicate projects)', () => {
    const disk = fakeStorage();
    const store = new ProjectStore(disk);
    store.save(newProject());
    store.save(startSession(newProject(), 'x').project); // now a backup exists too
    expect(store.list()).toHaveLength(1);
  });
});
