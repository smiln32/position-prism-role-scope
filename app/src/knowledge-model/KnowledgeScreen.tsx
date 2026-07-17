import { useEffect, useState } from 'react';
import type { KnowledgeModel, AnyEntity, CollectionKey } from './schema';
import type { ProjectFile } from '../project/store';
import {
  addRelationship, addDecision, addProcess, addJudgment,
  addHistory, addSystem, addCommitment, patchEntity, setVerified,
  addListItem, editListItem, removeListItem, listFieldValues, OWNER,
  type RelationshipInput, type DecisionInput, type ProcessInput, type JudgmentInput,
  type HistoryInput, type SystemInput, type CommitmentInput,
  type Attribution, type EnteredBy,
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
  add?: (m: KnowledgeModel, input: Record<string, unknown>, by: Attribution) => KnowledgeModel;
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
    addLabel: 'Add a relationship', add: (m, i, by) => addRelationship(m, i as unknown as RelationshipInput, by),
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
    addLabel: 'Add a process', add: (m, i, by) => addProcess(m, i as unknown as ProcessInput, by),
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
    addLabel: 'Add a decision', add: (m, i, by) => addDecision(m, i as unknown as DecisionInput, by),
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
    addLabel: 'Add a judgment call', add: (m, i, by) => addJudgment(m, i as unknown as JudgmentInput, by),
    title: (e) => (e as { heuristic: string }).heuristic,
    fields: [
      { name: 'heuristic', label: 'The rule of thumb', type: 'textarea' },
      { name: 'context', label: 'When it applies', type: 'text' },
    ],
  },
  {
    key: 'history', heading: 'History & scar tissue',
    blurb: 'What was tried, what failed, and why things are the way they are.',
    addLabel: 'Add a piece of history', add: (m, i, by) => addHistory(m, i as unknown as HistoryInput, by),
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
    addLabel: 'Add a system', add: (m, i, by) => addSystem(m, i as unknown as SystemInput, by),
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
    addLabel: 'Add a commitment', add: (m, i, by) => addCommitment(m, i as unknown as CommitmentInput, by),
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

/** One editable item in a list field: text input that commits on blur, plus Remove. */
function ListItemRow({ value, onCommit, onRemove }: {
  value: string; onCommit: (v: string) => void; onRemove: () => void;
}) {
  const [text, setText] = useState(value);
  // Re-sync when the underlying value changes (e.g. after a removal reindexes).
  useEffect(() => setText(value), [value]);
  const commit = () => {
    const t = text.trim();
    if (t && t !== value) onCommit(t); else setText(value);
  };
  return (
    <div className="row" style={{ gap: '0.4rem', marginBottom: '0.3rem', alignItems: 'center' }}>
      <input type="text" value={text} onChange={(e) => setText(e.target.value)}
        onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        aria-label={`Item: ${value}`} style={{ flex: 1 }} />
      <button className="quiet" onClick={onRemove} aria-label={`Remove item: ${value}`}>Remove</button>
    </div>
  );
}

/** An editable array field (a process's steps, a decision's criteria, …). */
function ListFieldEditor({ label, items, onAdd, onEdit, onRemove }: {
  label: string; items: string[];
  onAdd: (v: string) => void; onEdit: (i: number, v: string) => void; onRemove: (i: number) => void;
}) {
  const [adding, setAdding] = useState('');
  const add = () => { if (adding.trim()) { onAdd(adding.trim()); setAdding(''); } };
  return (
    <div className="field">
      <span>{label}</span>
      {items.length === 0 && <span className="small muted">None yet.</span>}
      {items.map((it, i) => (
        <ListItemRow key={`${i}:${it}`} value={it}
          onCommit={(v) => onEdit(i, v)} onRemove={() => onRemove(i)} />
      ))}
      <div className="row" style={{ gap: '0.4rem' }}>
        <input type="text" value={adding} placeholder="Add another…"
          onChange={(e) => setAdding(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') add(); }}
          aria-label={`Add to ${label}`} style={{ flex: 1 }} />
        <button className="quiet" onClick={add} disabled={!adding.trim()}>Add</button>
      </div>
    </div>
  );
}

/** Strip the add-form-only "(one per line)" hint for the inline editor label. */
const listLabel = (raw: string): string => raw.replace(/\s*\(one per line\)/i, '');

function EntityCard({ type, entity, model, onSave }: {
  type: TypeDef; entity: AnyEntity; model: KnowledgeModel; onSave: (next: KnowledgeModel) => void; }) {
  const rec = entity as unknown as Record<string, unknown>;
  const editable = type.fields.filter((f) => !f.addList);
  const listFields = type.fields.filter((f) => f.addList);
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
      {listFields.map((f) => (
        <ListFieldEditor key={f.name} label={listLabel(f.label)}
          items={listFieldValues(entity, f.name)}
          onAdd={(v) => onSave(addListItem(model, entity.id, f.name, v))}
          onEdit={(i, v) => onSave(editListItem(model, entity.id, f.name, i, v))}
          onRemove={(i) => onSave(removeListItem(model, entity.id, f.name, i))} />
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

/**
 * Who is at the keyboard. The owner speaking for their own business is a
 * different kind of source from an advisor writing up what they heard, and the
 * record has to say which. Memory-only for the sitting: the choice travels into
 * each entity's SourceRef, which is where it belongs and where it persists.
 */
function WhoIsEntering({ by, onChange }: {
  by: Attribution; onChange: (next: Attribution) => void;
}) {
  const set = (enteredBy: EnteredBy) => onChange({ ...by, enteredBy });
  return (
    <div className="card" style={{ borderStyle: 'dashed', marginTop: '1rem' }}>
      <span className="small"><strong>Who is entering this?</strong></span>
      <div className="row" style={{ gap: '1rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
        {(['owner', 'operator'] as EnteredBy[]).map((v) => (
          <label key={v} className="small" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <input type="radio" name="entered-by" checked={by.enteredBy === v}
              onChange={() => set(v)} />
            {v === 'owner' ? 'The owner, in their own words' : 'Someone else, writing up what the owner said'}
          </label>
        ))}
      </div>
      {by.enteredBy === 'operator' && (
        <div style={{ marginTop: '0.5rem' }}>
          <label className="field">
            <span>Your name (recorded as the source)</span>
            <input type="text" value={by.operatorName ?? ''}
              placeholder="e.g. J. Smith"
              onChange={(e) => onChange({ ...by, operatorName: e.target.value })} />
          </label>
          <p className="why" style={{ marginTop: '0.35rem' }}>
            Anything you add is recorded as your interpretation, not the owner's
            own words, and is marked <em>needs verification</em> until the owner
            confirms it. The owner's verbatim answers are never changed.
          </p>
        </div>
      )}
    </div>
  );
}

export default function KnowledgeScreen({ project, onSave, onBack }: {
  project: ProjectFile; onSave: (next: ProjectFile) => void; onBack: () => void;
}) {
  const save = (nextModel: KnowledgeModel) => onSave({ ...project, model: nextModel });
  const [by, setBy] = useState<Attribution>(OWNER);

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

      <WhoIsEntering by={by} onChange={setBy} />

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
            {t.add && <AddForm type={t} onAdd={(input) => save(t.add!(project.model, input, by))} />}
          </div>
        );
      })}
    </section>
  );
}
