import { useMemo, useState } from 'react';
import ModelInspector from './ModelInspector';
import InterviewScreen from './interview/InterviewScreen';
import DocumentsScreen from './analysis/DocumentsScreen';
import DeliverablesScreen from './deliverables/DeliverablesScreen';
import DashboardScreen from './dashboard/DashboardScreen';
import KnowledgeScreen from './knowledge-model/KnowledgeScreen';
import { createEmptyModel, newId } from './knowledge-model/model';
import {
  ProjectStore,
  startSession,
  resumeSession,
  endSession,
  PROJECT_FORMAT_VERSION,
  type ProjectFile,
  type StorageLike,
} from './project/store';
import { EncryptedStorage, isVaultConfigured, VAULT_KEY } from './project/vault';

type Screen =
  | { name: 'home' }
  | { name: 'new-project' }
  | { name: 'project'; projectId: string }
  | { name: 'interview'; projectId: string; sessionId: string }
  | { name: 'documents'; projectId: string }
  | { name: 'knowledge'; projectId: string }
  | { name: 'deliverables'; projectId: string }
  | { name: 'dashboard'; projectId: string }
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

/** Actions the app shell exposes for passphrase protection. */
interface Security {
  isEncrypted: boolean;
  onLock: () => void;
  enable: (passphrase: string) => Promise<void>;
  disable: () => Promise<void>;
}

/**
 * The app gate. If this computer has passphrase protection configured, the
 * app is locked until the owner unlocks it; otherwise it opens directly over
 * plaintext localStorage. `storage === window.localStorage` means plaintext
 * mode; an EncryptedStorage instance means an unlocked vault.
 */
export default function App() {
  const [storage, setStorage] = useState<StorageLike | null>(() =>
    isVaultConfigured(window.localStorage) ? null : window.localStorage,
  );

  if (storage === null) {
    return <UnlockScreen onOpened={(s) => setStorage(s)} />;
  }

  const security: Security = {
    isEncrypted: storage !== window.localStorage,
    onLock: () => setStorage(null),
    enable: async (passphrase) => {
      const vault = await EncryptedStorage.enable(window.localStorage, passphrase);
      await vault.flush();
      setStorage(vault);
    },
    disable: async () => {
      if (storage instanceof EncryptedStorage) {
        await storage.disable();
        setStorage(window.localStorage);
      }
    },
  };

  return <MainApp storage={storage} security={security} />;
}

function MainApp({ storage, security }: { storage: StorageLike; security: Security }) {
  const store = useMemo(() => new ProjectStore(storage), [storage]);
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  const [refresh, setRefresh] = useState(0);
  const bump = () => setRefresh((n) => n + 1);

  return (
    <main>
      {screen.name === 'home' && (
        <HomeScreen key={refresh} store={store} go={setScreen} security={security} />
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
      {screen.name === 'knowledge' && (
        <KnowledgeRoute key={`know-${screen.projectId}-${refresh}`} store={store}
          projectId={screen.projectId} go={setScreen} changed={bump} />
      )}
      {screen.name === 'deliverables' && (
        <DeliverablesRoute key={`del-${screen.projectId}`} store={store}
          projectId={screen.projectId} go={setScreen} changed={bump} />
      )}
      {screen.name === 'dashboard' && (
        <DashboardRoute key={`dash-${screen.projectId}-${refresh}`} store={store}
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

function HomeScreen({
  store, go, security,
}: {
  store: ProjectStore; go: (s: Screen) => void; security: Security;
}) {
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
          <input type="file" accept=".json" className="visually-hidden"
            onChange={(ev) => onImport(ev.target.files?.[0])} />
        </label>
      </div>
      {error && <p className="small" style={{ color: '#8b2f2f', marginTop: '0.75rem' }}>{error}</p>}

      <SecurityPanel security={security} />

      <p className="small muted" style={{ marginTop: '2.5rem' }}>
        <a href="#inspector" onClick={(e) => { e.preventDefault(); go({ name: 'inspector' }); }}>
          Model inspector
        </a>{' '}
        (developer view)
      </p>
    </section>
  );
}

const RED = '#8b2f2f';

function downloadText(text: string, filename: string): void {
  const blob = new Blob([text], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Home-screen control for turning passphrase protection on or off. */
function SecurityPanel({ security }: { security: Security }) {
  const [opening, setOpening] = useState(false);
  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (security.isEncrypted) {
    return (
      <div style={{ marginTop: '2.5rem', paddingTop: '1.25rem', borderTop: '1px solid #e3e0da' }}>
        <h2 style={{ marginTop: 0 }}>This computer is protected</h2>
        <p className="why">
          Your projects are stored on this computer behind your passphrase. When
          the app is locked, they cannot be read from the browser or the disk
          without it. Your passphrase is never saved anywhere - keep an exported
          project file as a backup, because a forgotten passphrase cannot be
          recovered.
        </p>
        <div className="row">
          <button onClick={security.onLock}>Lock now</button>
          <button className="quiet" onClick={() => {
            if (window.confirm('Remove passphrase protection? Your projects will be stored as plain text on this computer again.'))
              void security.disable();
          }}>
            Remove protection
          </button>
        </div>
      </div>
    );
  }

  const turnOn = async () => {
    setError('');
    if (pass.length < 8) { setError('Please choose a passphrase of at least 8 characters.'); return; }
    if (pass !== confirm) { setError('The two passphrases do not match.'); return; }
    if (!ack) { setError('Please confirm you understand a forgotten passphrase cannot be recovered.'); return; }
    setBusy(true);
    try {
      await security.enable(pass);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not turn on protection.');
      setBusy(false);
    }
  };

  return (
    <div style={{ marginTop: '2.5rem', paddingTop: '1.25rem', borderTop: '1px solid #e3e0da' }}>
      <h2 style={{ marginTop: 0 }}>Protect this computer</h2>
      <p className="why">
        Everything you enter is saved on this computer. Right now it is stored as
        plain text, so anyone who can open this browser profile could read it.
        You can lock it behind a passphrase - it will be asked for each time the
        app opens.
      </p>
      {!opening ? (
        <button onClick={() => setOpening(true)}>Set a passphrase</button>
      ) : (
        <div>
          <label className="field">
            <span>Choose a passphrase</span>
            <input type="password" value={pass} autoComplete="new-password"
              onChange={(e) => setPass(e.target.value)} />
          </label>
          <label className="field">
            <span>Type it again</span>
            <input type="password" value={confirm} autoComplete="new-password"
              onChange={(e) => setConfirm(e.target.value)} />
          </label>
          <label className="row" style={{ alignItems: 'flex-start', gap: '0.5rem', margin: '0.5rem 0' }}>
            <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)}
              style={{ marginTop: '0.3rem' }} />
            <span className="small">
              I understand that if I forget this passphrase, the data on this
              computer cannot be recovered, and I will keep an exported backup.
            </span>
          </label>
          {error && <p className="small" style={{ color: RED }}>{error}</p>}
          <div className="row">
            <button className="primary" disabled={busy} onClick={turnOn}>
              {busy ? 'Turning on…' : 'Turn on protection'}
            </button>
            <button className="quiet" disabled={busy} onClick={() => {
              setOpening(false); setPass(''); setConfirm(''); setAck(false); setError('');
            }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Full-screen lock gate shown when this computer has passphrase protection. */
function UnlockScreen({ onOpened }: { onOpened: (s: StorageLike) => void }) {
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showReset, setShowReset] = useState(false);

  const unlock = async () => {
    setBusy(true); setError('');
    try {
      onOpened(await EncryptedStorage.unlock(window.localStorage, pass));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not unlock.');
      setBusy(false);
    }
  };

  const resetAfterBackup = () => {
    if (!window.confirm('Download an encrypted backup and then clear the protected data on this computer? This is only reversible if you later remember the passphrase and restore the backup.'))
      return;
    // Preserve the ciphertext to a file first - nothing is destroyed outright.
    downloadText(EncryptedStorage.exportSealed(window.localStorage), 'Successor-encrypted-backup.json');
    const ls = window.localStorage;
    const toClear: string[] = [];
    for (let i = 0; i < ls.length; i++) {
      const k = ls.key(i);
      if (k && (k === VAULT_KEY || k.startsWith('successor:project:'))) toClear.push(k);
    }
    for (const k of toClear) ls.removeItem(k);
    onOpened(ls);
  };

  return (
    <main>
      <section>
        <h1>Successor</h1>
        <p className="muted">Business Owner Knowledge Succession</p>
        <h2>This computer is locked</h2>
        <p className="why">
          Your projects on this computer are protected by a passphrase. Enter it
          to unlock them. Nothing is sent anywhere - the passphrase stays on this
          computer, in memory only.
        </p>
        <label className="field">
          <span>Passphrase</span>
          <input type="password" value={pass} autoFocus autoComplete="current-password"
            onChange={(e) => setPass(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !busy) void unlock(); }} />
        </label>
        {error && <p className="small" style={{ color: RED }}>{error}</p>}
        <button className="primary" disabled={busy || !pass} onClick={() => void unlock()}>
          {busy ? 'Unlocking…' : 'Unlock'}
        </button>

        <p className="small muted" style={{ marginTop: '2rem' }}>
          <a href="#reset" onClick={(e) => { e.preventDefault(); setShowReset((v) => !v); }}>
            Forgotten your passphrase?
          </a>
        </p>
        {showReset && (
          <div className="card">
            <p className="small">
              A forgotten passphrase cannot be recovered - the protection is real.
              If you have an exported project file, you can start over and restore
              from it. This will save an encrypted backup of the current data to a
              file (openable only with the original passphrase), then clear this
              computer so you can begin again.
            </p>
            <button className="quiet" onClick={resetAfterBackup}>
              Save encrypted backup and start over
            </button>
          </div>
        )}
      </section>
      <Disclaimer />
    </main>
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

      <h2>Everything on record</h2>
      <p className="why">
        Why this: interviews and documents do not reach everything. Here you
        can add relationships, decisions, processes, history and more directly,
        confirm what looks right, and correct anything that is off. Every
        deliverable is built from exactly what is on record.
      </p>
      <button onClick={() => go({ name: 'knowledge', projectId })}>
        Review &amp; add knowledge
      </button>

      <h2>Documents</h2>
      <p className="why">
        Why documents: written records - vendor lists, old procedures,
        notes - can fill in what interviews miss, and catch what memory
        gets wrong.
      </p>
      <button onClick={() => go({ name: 'documents', projectId })}>
        Add or review documents{(project.documents?.length ?? 0) > 0 ? ` (${project.documents!.length} on file)` : ''}
      </button>

      <h2>Where things stand</h2>
      <p className="why">
        Why a dashboard: one look at completeness, risk, open questions, and
        how fresh the record is.
      </p>
      <button onClick={() => go({ name: 'dashboard', projectId })}>
        Open the dashboard
      </button>

      <h2>The succession package</h2>
      <p className="why">
        Why the package: this is what all of this becomes - the documents a
        successor, a buyer, or your family would actually use.
      </p>
      <button onClick={() => go({ name: 'deliverables', projectId })}>
        Open the succession package
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

function KnowledgeRoute({
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
    <KnowledgeScreen
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

function DeliverablesRoute({
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
    <DeliverablesScreen
      project={project}
      onSave={(next) => {
        store.save(next);
        setProject(next);
        changed();
      }}
      onBack={() => go({ name: 'project', projectId })}
    />
  );
}

function DashboardRoute({
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
    <DashboardScreen
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
