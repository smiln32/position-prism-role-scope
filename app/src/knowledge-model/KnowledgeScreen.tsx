import { useState } from 'react';
import type { KnowledgeModel, AnyEntity, CollectionKey } from './schema';
import type { ProjectFile } from '../project/store';
import {
  addRelationship, addDecision, addProcess, addJudgment,
  addHistory, addSystem, addCommitment, patchEntity, setVerified,
  type RelationshipInput, type DecisionInput, type ProcessInput, type JudgmentInput,
  type HistoryInput, type SystemInput, type CommitmentInput,
} from './capture';

/**
 * Owner-facing knowledge review & capture (Improvements #1 + #2). Lets the
 * owner directly enter the structured knowledge the interview does not produce
 * on its own, browse everything on record in plain language, and correct any
 * of it inline. All mutations go through the pure capture functions.
 */

type FieldType = 'text' | 'textarea' | 'select' | 'checkbox';
interface FieldDef {
  name: string; label: string; type: FieldType;
  options?: { value: string; label: string }[];
  /** Shown only in the Add form (list value, one per line). Not inline-editable. */
  addList?: boolean;
}
interface TypeDef {
  key: CollectionKey;
  heading: string;
  blurb: string;
  addLabel?: string;
  add?: (m: KnowledgeModel, input: Record<string, unknown>) => KnowledgeModel;
  fields: FieldDef[];
  title: (e: AnyEntity) => string;
}

const REL = [
  { value: 'customer', label: 'Customer' }, { value: 'vendor', label: 'Vendor / supplier' },
  { value: 'banker', label: 'Banker' }, { value: 'landlord', label: 'Landlord' },
  { value: 'employee', label: 'Employee' }, { value: 'advisor', label: 'Advisor' },
  { value: 'other', label: 'Other' },
];
const RISK = [{ value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' }];
const PLAN = [
  { value: 'not-started', label: 'Not started' }, { value: 'planned', label: 'Planned' },
  { value: 'in-progress', label: 'In progress' }, { value: 'transferred', label: 'Transferred' },
  { value: 'will-not-transfer', label: 'Will not transfer' },
];

const TYPES: TypeDef[] = [
  {
    key: 'relationships', heading: 'People & organizations',
    blurb: 'Customers, vendors, the banker, the landlord, key employees, advisors - who they are and what the relationship rests on.',
    addLabel: 'Add a relationship', add: (m, i) => addRelationship(m, i as unknown as RelationshipInput),
    title: (e) => (e as { who: string }).who,
    fields: [
      { name: 'who', label: 'Who', type: 'text' },
      { name: 'category', label: 'Kind', type: 'select', options: REL },
      { name: 'whyTheyMatter', label: 'Why they matter', type: 'textarea' },
      { name: 'whatTheyExpect', label: 'What they expect', type: 'textarea' },
      { name: 'history', label: 'History', type: 'textarea' },
      { name: 'transferRisk', label: 'Transfer risk', type: 'select', options: RISK },
      { name: 'transferPlanStatus', label: 'Transfer plan', type: 'select', options: PLAN },
    ],
  },
  {
    key: 'processes', heading: 'How things get done',
    blurb: 'The recurring work that keeps the place running - and who else knows how.',
    addLabel: 'Add a process', add: (m, i) => addProcess(m, i as unknown as ProcessInput),
    title: (e) => (e as { name: string }).name,
    fields: [
      { name: 'name', label: 'Name', type: 'text' },
      { name: 'purpose', label: 'Purpose', type: 'textarea' },
      { name: 'frequency', label: 'How often', type: 'text' },
      { name: 'steps', label: 'Steps (one per line)', type: 'textarea', addList: true },
      { name: 'whoElseKnows', label: 'Who else knows it (one per line)', type: 'textarea', addList: true },
    ],
  },
  {
    key: 'decisions', heading: 'Decisions & judgment',
    blurb: 'Recurring decisions - how they really get made, and the thresholds where the answer changes.',
    addLabel: 'Add a decision', add: (m, i) => addDecision(m, i as unknown as DecisionInput),
    title: (e) => (e as { name: string }).name,
    fields: [
      { name: 'name', label: 'Decision', type: 'text' },
      { name: 'howDecided', label: 'How it is decided', type: 'textarea' },
      { name: 'realCriteria', label: 'Real criteria (one per line)', type: 'textarea', addList: true },
      { name: 'thresholds', label: 'Thresholds (one per line)', type: 'textarea', addList: true },
    ],
  },
  {
    key: 'judgments', heading: 'Instincts & rules of thumb',
    blurb: 'The tacit layer - "when a customer does X, it means Y."',
    addLabel: 'Add a judgment call', add: (m, i) => addJudgment(m, i as unknown as JudgmentInput),
    title: (e) => (e as { heuristic: string }).heuristic,
    fields: [
      { name: 'heuristic', label: 'The rule of thumb', type: 'textarea' },
      { name: 'context', label: 'When it applies', type: 'text' },
    ],
  },
  {
    key: 'history', heading: 'History & scar tissue',
    blurb: 'What was tried, what failed, and why things are the way they are.',
    addLabel: 'Add a piece of history', add: (m, i) => addHistory(m, i as unknown as HistoryInput),
    title: (e) => (e as { whatHappened: string }).whatHappened,
    fields: [
      { name: 'whatHappened', label: 'What happened', type: 'textarea' },
      { name: 'when', label: 'When', type: 'text' },
      { name: 'whatWasLearned', label: 'What was learned', type: 'textarea' },
    ],
  },
  {
    key: 'systems', heading: 'Systems & access',
    blurb: 'Software, accounts, equipment - what each does and who holds access. Never passwords.',
    addLabel: 'Add a system', add: (m, i) => addSystem(m, i as unknown as SystemInput),
    title: (e) => (e as { name: string }).name,
    fields: [
      { name: 'name', label: 'Name', type: 'text' },
      { name: 'kind', label: 'Kind', type: 'text' },
      { name: 'whatItDoes', label: 'What it does', type: 'textarea' },
      { name: 'accessHeldBy', label: 'Who holds access', type: 'text' },
    ],
  },
  {
    key: 'commitments', heading: 'Commitments & handshakes',
    blurb: 'Informal promises and verbal arrangements a successor could step on without knowing.',
    addLabel: 'Add a commitment', add: (m, i) => addCommitment(m, i as unknown as CommitmentInput),
    title: (e) => (e as { withWhom: string }).withWhom,
    fields: [
      { name: 'withWhom', label: 'With whom', type: 'text' },
      { name: 'whatWasPromised', label: 'What was promised', type: 'textarea' },
      { name: 'direction', label: 'Owed by us / to us', type: 'text' },
      { name: 'writtenDown', label: 'Written down somewhere', type: 'checkbox' },
    ],
  },
  {
    key: 'facts', heading: "In the owner's own words",
    blurb: 'Answers captured verbatim from interviews and documents. Edit only to correct a mistake.',
    title: (e) => (e as { statement: string }).statement,
    fields: [{ name: 'statement', label: 'Statement', type: 'textarea' }],
  },
  {
    key: 'risks', heading: 'Risks on record',
    blurb: 'Single points of failure and fragilities. Confirm and refine what has been noted.',
    title: (e) => (e as { description: string }).description,
    fields: [
      { name: 'description', label: 'Risk', type: 'textarea' },
      { name: 'impact', label: 'Impact', type: 'text' },
    ],
  },
];

function Field({ def, value, onChange }: {
  def: FieldDef; value: string | boolean; onChange: (v: string | boolean) => void;
}) {
  if (def.type === 'checkbox') {
    return (
      <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
        <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)}
          aria-label={def.label} />
        <span>{def.label}</span>
      </label>
    );
  }
  return (
    <label className="field">
      <span>{def.label}</span>
      {def.type === 'select' ? (
        <select value={String(value)} onChange={(e) => onChange(e.target.value)}>
          {def.options!.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : def.type === 'textarea' ? (
        <textarea value={String(value)} rows={2} onChange={(e) => onChange(e.target.value)}
          style={{ font: 'inherit', padding: '0.4rem 0.55rem', border: '1px solid var(--rule)', borderRadius: '2px', resize: 'vertical' }} />
      ) : (
        <input type="text" value={String(value)} onChange={(e) => onChange(e.target.value)} />
      )}
    </label>
  );
}

function AddForm({ type, onAdd }: { type: TypeDef; onAdd: (input: Record<string, unknown>) => void }) {
  const primary = type.fields[0];
  const [open, setOpen] = useState(false);
  const [vals, setVals] = useState<Record<string, string | boolean>>({});

  const submit = () => {
    if (!String(vals[primary.name] ?? '').trim()) return;
    const input: Record<string, unknown> = {};
    for (const f of type.fields) {
      if (f.type === 'checkbox') input[f.name] = Boolean(vals[f.name]);
      else if (f.addList) input[f.name] = String(vals[f.name] ?? '').split('\n').map((x) => x.trim()).filter(Boolean);
      else input[f.name] = String(vals[f.name] ?? '');
    }
    onAdd(input);
    setVals({}); setOpen(false);
  };

  if (!open) {
    return <button className="quiet" onClick={() => setOpen(true)}>+ {type.addLabel}</button>;
  }
  return (
    <div className="card" style={{ borderStyle: 'dashed' }}>
      {type.fields.map((f) => (
        <Field key={f.name} def={f} value={vals[f.name] ?? (f.type === 'checkbox' ? false : '')}
          onChange={(v) => setVals((s) => ({ ...s, [f.name]: v }))} />
      ))}
      <div className="row" style={{ marginTop: '0.5rem' }}>
        <button className="primary" onClick={submit} disabled={!String(vals[primary.name] ?? '').trim()}>
          Add
        </button>
        <button className="quiet" onClick={() => { setVals({}); setOpen(false); }}>Cancel</button>
      </div>
    </div>
  );
}

function EntityCard({ type, entity, model, onSave }: {
  type: TypeDef; entity: AnyEntity; model: KnowledgeModel; onSave: (next: KnowledgeModel) => void; }) {
  const rec = entity as unknown as Record<string, unknown>;
  const editable = type.fields.filter((f) => !f.addList);
  const [draft, setDraft] = useState<Record<string, string | boolean>>({});
  const val = (f: FieldDef): string | boolean =>
    f.name in draft ? draft[f.name] : (rec[f.name] as string | boolean ?? (f.type === 'checkbox' ? false : ''));
  const dirty = Object.keys(draft).length > 0;

  const save = () => {
    let m = model;
    for (const [k, v] of Object.entries(draft)) m = patchEntity(m, entity.id, { [k]: v });
    onSave(m);
    setDraft({});
  };

  return (
    <div className="card">
      {editable.map((f) => (
        <Field key={f.name} def={f} value={val(f)}
          onChange={(v) => setDraft((sv) => ({ ...sv, [f.name]: v }))} />
      ))}
      <div className="row" style={{ marginTop: '0.5rem', alignItems: 'center' }}>
        <label className="small" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
          <input type="checkbox" checked={entity.verified}
            onChange={(e) => onSave(setVerified(model, entity.id, e.target.checked))}
            aria-label={`Confirmed: ${type.title(entity)}`} />
          Confirmed by the owner
        </label>
        {!entity.verified && <span className="small muted">needs verification</span>}
        {dirty && (
          <button className="primary" style={{ marginLeft: 'auto' }} onClick={save}>
            Save changes
          </button>
        )}
      </div>
    </div>
  );
}

export default function KnowledgeScreen({ project, onSave, onBack }: {
  project: ProjectFile; onSave: (next: ProjectFile) => void; onBack: () => void;
}) {
  const save = (nextModel: KnowledgeModel) => onSave({ ...project, model: nextModel });

  return (
    <section>
      <button className="quiet" onClick={onBack}>← Back to project</button>
      <h1 style={{ marginTop: '1rem' }}>Everything on record</h1>
      <p className="why">
        This is the knowledge that has been captured, in plain language. Add
        what the interview did not reach, confirm what looks right, and correct
        anything that is off. Every deliverable is built from exactly what is
        here - nothing is invented.
      </p>

      {TYPES.map((t) => {
        const items = project.model.entities[t.key] as AnyEntity[];
        return (
          <div key={t.key} style={{ marginTop: '2rem' }}>
            <h2>{t.heading} <span className="small muted">({items.length})</span></h2>
            <p className="why">{t.blurb}</p>
            {items.length === 0 && <p className="muted small">Not yet captured.</p>}
            {items.map((e) => (
              <EntityCard key={e.id} type={t} entity={e} model={project.model} onSave={save} />
            ))}
            {t.add && <AddForm type={t} onAdd={(input) => save(t.add!(project.model, input))} />}
          </div>
        );
      })}
    </section>
  );
}
