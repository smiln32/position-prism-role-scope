import { useState } from 'react';
import {
  analyzeDocument, listOpenConflicts, resolveConflict,
  type ConflictChoice, type AnalysisReport,
} from './extract';
import { RuleBasedEngine } from '../interview/engine';
import { newId } from '../knowledge-model/model';
import type { ProjectFile } from '../project/store';

export default function DocumentsScreen({
  project, onSave, onBack,
}: {
  project: ProjectFile;
  onSave: (next: ProjectFile) => void;
  onBack: () => void;
}) {
  const [pasted, setPasted] = useState('');
  const [docName, setDocName] = useState('');
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [error, setError] = useState('');

  const memory = project.interviewMemory ?? new RuleBasedEngine().createMemory();
  const conflicts = listOpenConflicts(project.model);
  const documents = project.documents ?? [];

  const addDocument = (name: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) { setError('There is nothing to read in that document.'); return; }
    const doc = {
      id: newId('doc'),
      name: name.trim() || `Pasted notes ${documents.length + 1}`,
      addedAt: new Date().toISOString(),
      text: trimmed,
    };
    const result = analyzeDocument(project.model, memory.knownNames, doc);
    onSave({
      ...project,
      model: result.model,
      interviewMemory: { ...memory, knownNames: result.knownNames },
      documents: [...documents, doc],
    });
    setReport(result.report);
    setPasted('');
    setDocName('');
    setError('');
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      addDocument(f.name, await f.text());
    } catch {
      setError('That file could not be read as text.');
    }
  };

  const resolve = (gapId: string, choice: ConflictChoice) => {
    onSave({ ...project, model: resolveConflict(project.model, gapId, choice) });
  };

  return (
    <section>
      <button className="quiet" onClick={onBack}>← Back to project</button>
      <h1 style={{ marginTop: '1rem' }}>Documents</h1>
      <p className="why">
        Why documents: vendor lists, old procedures, lease notes, meeting
        notes - anything written down joins what you have said in
        interviews. Every line is kept in its original words, and if a
        document disagrees with something you said, we will show you both
        and ask which is right.
      </p>

      {conflicts.length > 0 && (
        <>
          <h2>Something does not line up</h2>
          {conflicts.map((c) => (
            <div className="card" key={c.gapId}>
              <p className="small" style={{ marginBottom: '0.4rem' }}>
                <strong>The document says:</strong> {c.documentStatement}
              </p>
              <p className="small" style={{ marginBottom: '0.75rem' }}>
                <strong>You said:</strong> {c.interviewStatement}
              </p>
              <div className="row">
                <button onClick={() => resolve(c.gapId, 'document')}>The document is right</button>
                <button onClick={() => resolve(c.gapId, 'interview')}>What I said is right</button>
                <button className="quiet" onClick={() => resolve(c.gapId, 'both')}>Both are true</button>
              </div>
            </div>
          ))}
        </>
      )}

      <h2>Add a document</h2>
      <label className="field">
        <span>Name <span className="muted">(optional)</span></span>
        <input type="text" value={docName} onChange={(e) => setDocName(e.target.value)}
          placeholder="e.g. Vendor list" style={{ maxWidth: '18rem' }} />
      </label>
      <textarea
        value={pasted}
        onChange={(e) => setPasted(e.target.value)}
        rows={6}
        placeholder="Paste the document text here..."
        style={{
          font: 'inherit', width: '100%', padding: '0.5rem 0.6rem',
          border: '1px solid var(--rule)', borderRadius: '2px', resize: 'vertical',
        }}
        aria-label="Document text"
      />
      <div className="row" style={{ marginTop: '0.75rem' }}>
        <button className="primary" onClick={() => addDocument(docName, pasted)}>Read this document</button>
        <label className="buttonlike">
          Or upload a text file…
          <input type="file" accept=".txt,.md,.csv" className="visually-hidden"
            onChange={(ev) => onFile(ev.target.files?.[0])} />
        </label>
      </div>
      {error && <p className="small" style={{ color: '#8b2f2f', marginTop: '0.75rem' }}>{error}</p>}
      {report && (
        <p className="small muted" style={{ marginTop: '0.75rem' }}>
          Read {report.factsAdded} line{report.factsAdded === 1 ? '' : 's'} in the document's own words
          {report.nameGaps > 0 ? ` · ${report.nameGaps} name${report.nameGaps === 1 ? '' : 's'} to ask about` : ''}
          {report.conflicts > 0 ? ` · ${report.conflicts} disagreement${report.conflicts === 1 ? '' : 's'} to settle above` : ''}
          {report.linesSkipped > 0 ? ` · ${report.linesSkipped} lines past the 500-line limit were not read` : ''}
        </p>
      )}

      {documents.length > 0 && (
        <>
          <h2>Documents on file</h2>
          {documents.map((d) => (
            <div className="card" key={d.id}>
              <p className="small">{d.name}</p>
              <p className="small muted">{d.text.split('\n').length} lines · added {new Date(d.addedAt).toLocaleDateString()}</p>
            </div>
          ))}
        </>
      )}
    </section>
  );
}
