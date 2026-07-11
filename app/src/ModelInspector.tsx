import { useState } from 'react';
import {
  importModel,
  exportModel,
  validateModel,
  entityCount,
  createEmptyModel,
} from './knowledge-model/model';
import { fixtureModel } from './knowledge-model/fixture';
import { COLLECTION_KEYS, type KnowledgeModel, type AnyEntity } from './knowledge-model/schema';

const box: React.CSSProperties = {
  border: '1px solid var(--rule)',
  padding: '1rem',
  marginBottom: '1rem',
  fontSize: '0.85rem',
};

function EntityRow({ e }: { e: AnyEntity }) {
  const [open, setOpen] = useState(false);
  const label =
    'statement' in e ? e.statement :
    'name' in e ? e.name :
    'who' in e ? e.who :
    'heuristic' in e ? e.heuristic :
    'whatHappened' in e ? e.whatHappened :
    'withWhom' in e ? `${e.withWhom}: ${e.whatWasPromised}` :
    'description' in e ? e.description :
    e.question;
  return (
    <li style={{ marginBottom: '0.4rem' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', textAlign: 'left', padding: 0 }}
        aria-expanded={open}
      >
        {open ? '▾' : '▸'} <code>{e.id}</code> · {e.confidence} confidence
        {e.verified ? ' · verified' : ''} — {String(label).slice(0, 90)}
      </button>
      {open && (
        <pre style={{ ...box, overflowX: 'auto', marginTop: '0.4rem', background: '#fafafa' }}>
          {JSON.stringify(e, null, 2)}
        </pre>
      )}
    </li>
  );
}

export default function ModelInspector() {
  const [model, setModel] = useState<KnowledgeModel | null>(null);
  const [message, setMessage] = useState('');

  const load = (m: KnowledgeModel, label: string) => {
    setModel(m);
    setMessage(`${label} loaded. ${entityCount(m)} entities. Validation: ${validateModel(m).length === 0 ? 'clean' : 'ERRORS'}.`);
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      load(importModel(await f.text()), `Imported "${f.name}"`);
    } catch (err) {
      setModel(null);
      setMessage(err instanceof Error ? err.message : 'Import failed.');
    }
  };

  const download = () => {
    if (!model) return;
    const blob = new Blob([exportModel(model)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${model.projectId}-model.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <section style={{ marginTop: '2rem' }}>
      <h2 style={{ fontSize: '1.2rem', fontWeight: 'normal', marginBottom: '0.75rem' }}>
        Model inspector (developer view, Stage 1)
      </h2>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <button onClick={() => load(createEmptyModel('new-project', { businessName: '(unnamed)', ownerName: '(unnamed)' }), 'Empty model')}>
          Load empty model
        </button>
        <button onClick={() => load(fixtureModel, 'Fixture model (fictional business)')}>
          Load fixture model
        </button>
        <label style={{ border: '1px solid var(--rule)', padding: '0.2rem 0.6rem', cursor: 'pointer' }}>
          Import JSON…
          <input type="file" accept=".json" className="visually-hidden"
            onChange={(ev) => onFile(ev.target.files?.[0])} />
        </label>
        {model && <button onClick={download}>Export JSON</button>}
      </div>
      {message && <p style={{ ...box }}>{message}</p>}
      {model && (
        <div>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '0.75rem' }}>
            {model.profile.businessName} · schema {model.schemaVersion} · subject role: {model.subjectRole}
          </p>
          {COLLECTION_KEYS.map((key) => {
            const list = model.entities[key] as AnyEntity[];
            return (
              <details key={key} open={list.length > 0} style={{ marginBottom: '0.5rem' }}>
                <summary style={{ cursor: 'pointer' }}>
                  {key} ({list.length})
                </summary>
                <ul style={{ listStyle: 'none', margin: '0.5rem 0 0 1rem' }}>
                  {list.length === 0
                    ? <li style={{ color: 'var(--muted)' }}>none</li>
                    : list.map((e) => <EntityRow key={e.id} e={e} />)}
                </ul>
              </details>
            );
          })}
        </div>
      )}
    </section>
  );
}
