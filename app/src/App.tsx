import { useMemo, useState } from 'react';
import ModelInspector from './ModelInspector';
import InterviewScreen from './interview/InterviewScreen';
import DocumentsScreen from './analysis/DocumentsScreen';
import { createEmptyModel, newId } from './knowledge-model/model';
import {
  ProjectStore,
  startSession,
  resumeSession,
  endSession,
  PROJECT_FORMAT_VERSION,
  type ProjectFile,
} from './project/store';

type Screen =
  | { name: 'home' }
  | { name: 'new-project' }
  | { name: 'project'; projectId: string }
  | { name: 'interview'; projectId: string; sessionId: string }
  | { name: 'documents'; projectId: string }
  | { name: 'inspector' };

function Disclaimer() {
  return (
    <p className="disclaimer">
      Successor documents operating knowledge only. It does not provide
      financial, tax, legal, or estate planning advice. Please work with your
      CPA, attorney, and exit planner for those matters.
    </p>
  );
}

function fmt(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });
  } catch { return iso; }
}

export default function App() {
  const store = useMemo(() => new ProjectStore(window.localStorage), []);
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  const [refresh, setRefresh] = useState(0);
  const bump = () => setRefresh((n) => n + 1);

  return (
    <main>
      {screen.name === 'home' && (
        <HomeScreen key={refresh} store={store} go={setScreen} />
      )}
      {screen.name === 'new-project' && (
        <NewProjectScreen store={store} go={setScreen} />
      )}
      {screen.name === 'project' && (
        <ProjectScreen key={`${screen.projectId}-${refresh}`} store={store}
          projectId={screen.projectId} go={setScreen} changed={bump} />
      )}
      {screen.name === 'interview' && (
        <InterviewRoute key={`${screen.projectId}-${screen.sessionId}`} store={store}
          projectId={screen.projectId} sessionId={screen.sessionId}
          go={setScreen} changed={bump} />
      )}
      {screen.name === 'documents' && (
        <DocumentsRoute key={`docs-${screen.projectId}-${refresh}`} store={store}
          projectId={screen.projectId} go={setScreen} changed={bump} />
      )}
      {screen.name === 'inspector' && (
        <section>
          <button className="quiet" onClick={() => setScreen({ name: 'home' })}>← Back</button>
          <ModelInspector />
        </section>
      )}
      <Disclaimer />
    </main>
  );
}

function HomeScreen({ store, go }: { store: ProjectStore; go: (s: Screen) => void }) {
  const [error, setError] = useState('');
  const projects = store.list();

  const onImport = async (f: File | undefined) => {
    if (!f) return;
    try {
      const p = store.importJson(await f.text());
      go({ name: 'project', projectId: p.model.projectId });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.');
    }
  };

  return (
    <section>
      <h1>Successor</h1>
      <p className="muted">Business Owner Knowledge Succession</p>
      <p>
        Thirty years of running a business creates knowledge that lives only
        in your head. Successor helps you get it out - so the people who come
        after you can run the business the way it actually runs.
      </p>

      <h2>Your projects</h2>
      <p className="why">
        Everything you enter stays on this computer. Nothing is sent anywhere.
        You can export a project file at any time to keep your own copy.
      </p>

      {projects.length === 0 && (
        <p className="muted">No projects yet. Start one below.</p>
      )}
      {projects.map((p) => (
        <div className="card" key={p.projectId}>
          <p style={{ marginBottom: '0.35rem' }}>{p.businessName}</p>
          <p className="small muted" style={{ marginBottom: '0.6rem' }}>
            {p.sessionCount} session{p.sessionCount === 1 ? '' : 's'} · last saved {fmt(p.updatedAt)}
          </p>
          <button onClick={() => go({ name: 'project', projectId: p.projectId })}>
            Open
          </button>
        </div>
      ))}

      <div className="row" style={{ marginTop: '1.25rem' }}>
        <button className="primary" onClick={() => go({ name: 'new-project' })}>
          Start a new project
        </button>
        <label className="buttonlike">
          Restore from a project file…
          <input type="file" accept=".json" style={{ display: 'none' }}
            onChange={(ev) => onImport(ev.target.files?.[0])} />
        </label>
      </div>
      {error && <p className="small" style={{ color: '#8b2f2f', marginTop: '0.75rem' }}>{error}</p>}

      <p className="small muted" style={{ marginTop: '2.5rem' }}>
        <a href="#inspector" onClick={(e) => { e.preventDefault(); go({ name: 'inspector' }); }}>
          Model inspector
        </a>{' '}
        (developer view)
      </p>
    </section>
  );
}

function NewProjectScreen({ store, go }: { store: ProjectStore; go: (s: Screen) => void }) {
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [industry, setIndustry] = useState('');
  const [employeeCount, setEmployeeCount] = useState('');
  const [exitWindow, setExitWindow] = useState('');
  const [error, setError] = useState('');

  const create = () => {
    if (!businessName.trim() || !ownerName.trim()) {
      setError('The business name and your name are the only two things we need to begin.');
      return;
    }
    const project: ProjectFile = {
      formatVersion: PROJECT_FORMAT_VERSION,
      model: createEmptyModel(newId('proj'), {
        businessName: businessName.trim(),
        ownerName: ownerName.trim(),
        industry: industry.trim() || undefined,
        employeeCount: employeeCount.trim() || undefined,
        plannedExitWindow: exitWindow.trim() || undefined,
      }),
      sessions: [],
    };
    store.save(project);
    go({ name: 'project', projectId: project.model.projectId });
  };

  return (
    <section>
      <button className="quiet" onClick={() => go({ name: 'home' })}>← Back</button>
      <h1 style={{ marginTop: '1rem' }}>Tell us about the business</h1>
      <p className="why">
        Why we ask: these few details label your project and help later
        documents read naturally. Only the first two are required. You can
        change any of this later.
      </p>

      <label className="field">
        <span>Business name</span>
        <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
      </label>
      <label className="field">
        <span>Your name</span>
        <input type="text" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
      </label>
      <label className="field">
        <span>What the business does <span className="muted">(optional)</span></span>
        <input type="text" value={industry} onChange={(e) => setIndustry(e.target.value)} />
      </label>
      <label className="field">
        <span>Roughly how many employees <span className="muted">(optional)</span></span>
        <input type="text" value={employeeCount} onChange={(e) => setEmployeeCount(e.target.value)} />
      </label>
      <label className="field">
        <span>When you hope to step back <span className="muted">(optional - e.g. "3 to 5 years")</span></span>
        <input type="text" value={exitWindow} onChange={(e) => setExitWindow(e.target.value)} />
      </label>

      {error && <p className="small" style={{ color: '#8b2f2f' }}>{error}</p>}
      <button className="primary" onClick={create}>Create project</button>
    </section>
  );
}

function ProjectScreen({
  store, projectId, go, changed,
}: {
  store: ProjectStore; projectId: string; go: (s: Screen) => void; changed: () => void;
}) {
  const [project, setProject] = useState<ProjectFile | null>(() => {
    try { return store.load(projectId); } catch { return null; }
  });
  const [newLabel, setNewLabel] = useState('');

  if (!project) {
    return (
      <section>
        <button className="quiet" onClick={() => go({ name: 'home' })}>← Back</button>
        <p style={{ marginTop: '1rem' }}>That project could not be loaded from this computer.</p>
      </section>
    );
  }

  const apply = (next: ProjectFile) => {
    next.model.updatedAt = new Date().toISOString();
    store.save(next);
    setProject(next);
    changed();
  };

  const exportProject = () => {
    const blob = new Blob([store.exportJson(projectId)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const safe = project.model.profile.businessName.replace(/[^A-Za-z0-9 ]/g, '').trim().replace(/ +/g, '-');
    a.download = `Successor-${safe || projectId}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const { profile } = project.model;
  const active = project.sessions.filter((s) => s.status === 'active');
  const ended = project.sessions.filter((s) => s.status === 'ended');

  return (
    <section>
      <button className="quiet" onClick={() => go({ name: 'home' })}>← All projects</button>
      <h1 style={{ marginTop: '1rem' }}>{profile.businessName}</h1>
      <p className="muted">
        {profile.ownerName}
        {profile.industry ? ` · ${profile.industry}` : ''}
        {profile.employeeCount ? ` · about ${profile.employeeCount} employees` : ''}
        {profile.plannedExitWindow ? ` · stepping back in ${profile.plannedExitWindow}` : ''}
      </p>

      <h2>Sessions</h2>
      <p className="why">
        Why sessions: capturing a business takes several unhurried sittings,
        not one long one. Each sitting is a session you can leave and pick
        back up. The interviews themselves arrive in the next part of the
        build - for now, sessions can be created, resumed, and ended.
      </p>

      {active.map((s) => (
        <div className="card" key={s.id}>
          <p style={{ marginBottom: '0.35rem' }}>{s.label}</p>
          <p className="small muted" style={{ marginBottom: '0.6rem' }}>
            started {fmt(s.startedAt)} · last picked up {fmt(s.lastResumedAt)}
          </p>
          <div className="row">
            <button className="primary" onClick={() => {
              apply(resumeSession(project, s.id));
              go({ name: 'interview', projectId, sessionId: s.id });
            }}>
              {s.interview ? 'Continue interview' : 'Begin interview'}
            </button>
            <button className="quiet" onClick={() => apply(endSession(project, s.id))}>End session</button>
          </div>
        </div>
      ))}

      <div className="row" style={{ margin: '1rem 0 1.5rem' }}>
        <input type="text" placeholder="Name this sitting (optional)" value={newLabel}
          style={{ maxWidth: '18rem' }}
          onChange={(e) => setNewLabel(e.target.value)} />
        <button className="primary"
          onClick={() => { apply(startSession(project, newLabel).project); setNewLabel(''); }}>
          Start a session
        </button>
      </div>

      {ended.length > 0 && (
        <details>
          <summary className="small muted" style={{ cursor: 'pointer' }}>
            {ended.length} ended session{ended.length === 1 ? '' : 's'}
          </summary>
          {ended.map((s) => (
            <div className="card" key={s.id}>
              <p className="small">{s.label} · started {fmt(s.startedAt)}</p>
              <button className="quiet" onClick={() => apply(resumeSession(project, s.id))}>Reopen</button>
            </div>
          ))}
        </details>
      )}

      <h2>Documents</h2>
      <p className="why">
        Why documents: written records - vendor lists, old procedures,
        notes - can fill in what interviews miss, and catch what memory
        gets wrong.
      </p>
      <button onClick={() => go({ name: 'documents', projectId })}>
        Add or review documents{(project.documents?.length ?? 0) > 0 ? ` (${project.documents!.length} on file)` : ''}
      </button>

      <h2>Your copy of everything</h2>
      <p className="why">
        Why export: your project lives only on this computer. Exporting gives
        you a single file you can keep, back up, or move to another machine
        with "Restore from a project file" on the home screen.
      </p>
      <button onClick={exportProject}>Export this project</button>
    </section>
  );
}

function InterviewRoute({
  store, projectId, sessionId, go, changed,
}: {
  store: ProjectStore; projectId: string; sessionId: string;
  go: (s: Screen) => void; changed: () => void;
}) {
  const [project, setProject] = useState<ProjectFile | null>(() => {
    try { return store.load(projectId); } catch { return null; }
  });
  if (!project) {
    return (
      <section>
        <button className="quiet" onClick={() => go({ name: 'home' })}>← Back</button>
        <p style={{ marginTop: '1rem' }}>That project could not be loaded from this computer.</p>
      </section>
    );
  }
  const session = project.sessions.find((s) => s.id === sessionId);
  if (!session) {
    return (
      <section>
        <button className="quiet" onClick={() => go({ name: 'project', projectId })}>← Back</button>
        <p style={{ marginTop: '1rem' }}>That session no longer exists in this project.</p>
      </section>
    );
  }
  return (
    <InterviewScreen
      project={project}
      session={session}
      onSave={(next) => {
        next.model.updatedAt = new Date().toISOString();
        store.save(next);
        setProject(next);
        changed();
      }}
      onBack={() => go({ name: 'project', projectId })}
    />
  );
}

function DocumentsRoute({
  store, projectId, go, changed,
}: {
  store: ProjectStore; projectId: string;
  go: (s: Screen) => void; changed: () => void;
}) {
  const [project, setProject] = useState<ProjectFile | null>(() => {
    try { return store.load(projectId); } catch { return null; }
  });
  if (!project) {
    return (
      <section>
        <button className="quiet" onClick={() => go({ name: 'home' })}>← Back</button>
        <p style={{ marginTop: '1rem' }}>That project could not be loaded from this computer.</p>
      </section>
    );
  }
  return (
    <DocumentsScreen
      project={project}
      onSave={(next) => {
        next.model.updatedAt = new Date().toISOString();
        store.save(next);
        setProject(next);
        changed();
      }}
      onBack={() => go({ name: 'project', projectId })}
    />
  );
}
