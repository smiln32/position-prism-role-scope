import type { KnowledgeModel } from '../knowledge-model/schema';
import { validateModel, newId, type ValidationError } from '../knowledge-model/model';

/**
 * Project file format v1 (see DECISIONS.md, Stage 2).
 * Wraps the frozen KnowledgeModel without modifying it. Sessions are
 * app-level records, not captured knowledge.
 */

export const PROJECT_FORMAT_VERSION = '1.0.0';

export type SessionStatus = 'active' | 'ended';

export interface SessionMeta {
  id: string;
  label: string;
  startedAt: string;
  lastResumedAt: string;
  status: SessionStatus;
  /** Which interview track this session works on (Stage 4+). */
  trackId?: string;
  /** This session's transcript (Stage 4+). */
  transcript?: import('../interview/engine').QA[];
  /** Legacy Stage 3 per-session state - migrated to project memory on load. */
  interview?: LegacyInterviewState;
}

/** Shape of the retired Stage 3 per-session state, kept for migration. */
interface LegacyInterviewState {
  trackId: string;
  answeredAreas: string[];
  followUpQueue: { areaId: string; question: string; reason: string }[];
  answerCount: number;
  transcript: { areaId: string; question: string; answer: string; answeredAt: string }[];
  knownNames: string[];
  complete: boolean;
}

export interface ProjectFile {
  formatVersion: string;
  model: KnowledgeModel;
  sessions: SessionMeta[];
  /** Project-level interview memory (Stage 4+): threads and coverage
   *  persist across sessions. Optional and additive. */
  interviewMemory?: import('../interview/engine').ProjectInterviewMemory;
  /** Uploaded/pasted documents (Stage 5+). Optional and additive. */
  documents?: import('../analysis/extract').ProjectDocument[];
  /** Per-deliverable version counters (Stage 6+). Optional and additive. */
  deliverableVersions?: Record<string, number>;
}

/** Fold legacy Stage 3 per-session interview state into project memory. */
export function migrateProject(p: ProjectFile): ProjectFile {
  const legacySessions = p.sessions.filter((s) => s.interview);
  if (legacySessions.length === 0) return p;
  const next: ProjectFile = JSON.parse(JSON.stringify(p));
  const memory = next.interviewMemory ?? {
    trackProgress: {}, pendingThreads: [], knownNames: [], answerCount: 0,
  };
  for (const s of next.sessions) {
    const legacy = s.interview;
    if (!legacy) continue;
    const prog = memory.trackProgress[legacy.trackId] ?? { answeredAreas: [] };
    for (const a of legacy.answeredAreas) if (!prog.answeredAreas.includes(a)) prog.answeredAreas.push(a);
    memory.trackProgress[legacy.trackId] = prog;
    for (const f of legacy.followUpQueue) {
      memory.pendingThreads.push({ trackId: legacy.trackId, ...f });
    }
    for (const n of legacy.knownNames) if (!memory.knownNames.includes(n)) memory.knownNames.push(n);
    memory.answerCount += legacy.answerCount;
    s.trackId = legacy.trackId;
    s.transcript = legacy.transcript.map((t) => ({ trackId: legacy.trackId, ...t }));
    delete s.interview;
  }
  next.interviewMemory = memory;
  return next;
}

/** Storage abstraction so tests can inject an in-memory backend. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  key(index: number): string | null;
  readonly length: number;
}

const PREFIX = 'successor:project:';

export function validateProjectFile(p: unknown): ValidationError[] {
  const errors: ValidationError[] = [];
  if (typeof p !== 'object' || p === null)
    return [{ path: '$', message: 'project file is not an object' }];
  const f = p as Partial<ProjectFile>;
  if (f.formatVersion !== PROJECT_FORMAT_VERSION)
    errors.push({ path: '$.formatVersion', message: `expected ${PROJECT_FORMAT_VERSION}, got ${String(f.formatVersion)}` });
  if (!Array.isArray(f.sessions))
    errors.push({ path: '$.sessions', message: 'missing sessions array' });
  else
    f.sessions.forEach((s, i) => {
      if (!s.id || !s.startedAt || !s.status)
        errors.push({ path: `$.sessions[${i}]`, message: 'session requires id, startedAt, status' });
    });
  if (!f.model) errors.push({ path: '$.model', message: 'missing model' });
  else errors.push(...validateModel(f.model));
  return errors;
}

export class ProjectStore {
  private storage: StorageLike;
  constructor(storage: StorageLike) {
    this.storage = storage;
  }

  save(project: ProjectFile): void {
    const errors = validateProjectFile(project);
    if (errors.length > 0)
      throw new Error('Refusing to save an invalid project: ' + errors.map((e) => `${e.path}: ${e.message}`).join('; '));
    this.storage.setItem(PREFIX + project.model.projectId, JSON.stringify(project));
  }

  load(projectId: string): ProjectFile {
    const raw = this.storage.getItem(PREFIX + projectId);
    if (raw === null) throw new Error(`No saved project with id "${projectId}".`);
    const parsed: unknown = JSON.parse(raw);
    const errors = validateProjectFile(parsed);
    if (errors.length > 0)
      throw new Error('Saved project failed validation: ' + errors.map((e) => `${e.path}: ${e.message}`).join('; '));
    return migrateProject(parsed as ProjectFile);
  }

  list(): { projectId: string; businessName: string; updatedAt: string; sessionCount: number }[] {
    const out = [];
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (!key || !key.startsWith(PREFIX)) continue;
      try {
        const p = JSON.parse(this.storage.getItem(key)!) as ProjectFile;
        out.push({
          projectId: p.model.projectId,
          businessName: p.model.profile.businessName,
          updatedAt: p.model.updatedAt,
          sessionCount: p.sessions.length,
        });
      } catch {
        // Unreadable entry: skip, never delete. The user can export storage manually.
      }
    }
    return out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  remove(projectId: string): void {
    this.storage.removeItem(PREFIX + projectId);
  }

  exportJson(projectId: string): string {
    return JSON.stringify(this.load(projectId), null, 2);
  }

  importJson(json: string): ProjectFile {
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      throw new Error('Import failed: not valid JSON.');
    }
    const errors = validateProjectFile(parsed);
    if (errors.length > 0)
      throw new Error('Import failed validation: ' + errors.map((e) => `${e.path}: ${e.message}`).join('; '));
    const project = migrateProject(parsed as ProjectFile);
    this.save(project);
    return project;
  }
}

/** Session helpers - pure functions on the project file. */
export function startSession(project: ProjectFile, label: string): { project: ProjectFile; session: SessionMeta } {
  const now = new Date().toISOString();
  const session: SessionMeta = {
    id: newId('sess'),
    label: label.trim() || `Session ${project.sessions.length + 1}`,
    startedAt: now,
    lastResumedAt: now,
    status: 'active',
  };
  return { project: { ...project, sessions: [...project.sessions, session] }, session };
}

export function resumeSession(project: ProjectFile, sessionId: string): ProjectFile {
  const now = new Date().toISOString();
  return {
    ...project,
    sessions: project.sessions.map((s) =>
      s.id === sessionId ? { ...s, lastResumedAt: now, status: 'active' } : s,
    ),
  };
}

export function endSession(project: ProjectFile, sessionId: string): ProjectFile {
  return {
    ...project,
    sessions: project.sessions.map((s) =>
      s.id === sessionId ? { ...s, status: 'ended' } : s,
    ),
  };
}
