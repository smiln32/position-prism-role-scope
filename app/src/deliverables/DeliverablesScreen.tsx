import { useEffect, useState } from 'react';
import { renderPackage, deliverablesFor, DISCLAIMER, type Rendered } from './render';
import { downloadPdf } from './pdf';
import { exportModel } from '../knowledge-model/model';
import type { ProjectFile } from '../project/store';

function download(name: string, text: string, type = 'text/markdown') {
  const blob = new Blob([text], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function DeliverablesScreen({
  project, onSave, onBack,
}: {
  project: ProjectFile;
  onSave: (next: ProjectFile) => void;
  onBack: () => void;
}) {
  const [docs, setDocs] = useState<Rendered[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  // PDF generation is async (the PDF engine loads on first use); one at a time.
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState('');

  const toPdf = async (toRender: Rendered[], filename: string) => {
    if (pdfBusy) return;
    setPdfBusy(true); setPdfError('');
    try {
      await downloadPdf(toRender, filename);
    } catch {
      setPdfError('The PDF could not be generated. The markdown download always works.');
    } finally {
      setPdfBusy(false);
    }
  };

  // Opening a document to read it, or returning to the list, is a full view
  // change within this screen - start it at the top rather than wherever the
  // reader had scrolled the previous view.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [openId]);

  const generate = () => {
    const { rendered, versions } = renderPackage(project);
    setDocs(rendered);
    setOpenId(null);
    onSave({ ...project, deliverableVersions: versions });
  };

  const safeName = project.model.profile.businessName.replace(/[^A-Za-z0-9 ]/g, '').trim().replace(/ +/g, '-');
  const open = docs?.find((d) => d.id === openId) ?? null;
  const docCount = deliverablesFor(project).length;

  if (open) {
    return (
      <section>
        <div className="row no-print" style={{ marginBottom: '1rem' }}>
          <button className="quiet" onClick={() => setOpenId(null)}>← All documents</button>
          <button onClick={() => toPdf([open], `${safeName}-${open.id}-v${open.version}.pdf`)} disabled={pdfBusy}>
            {pdfBusy ? 'Preparing PDF…' : 'Download PDF'}
          </button>
          <button onClick={() => download(`${safeName}-${open.id}-v${open.version}.md`, open.markdown)}>Download markdown</button>
          <button onClick={() => window.print()}>Print</button>
        </div>
        <article style={{ whiteSpace: 'pre-wrap' }}>{open.markdown}</article>
      </section>
    );
  }

  return (
    <section>
      <button className="quiet" onClick={onBack}>← Back to project</button>
      <h1 style={{ marginTop: '1rem' }}>The succession package</h1>
      <p className="why">
        Why a package: {docCount} documents, each a different view of the same
        knowledge - everything in your own words, marked wherever a point
        still needs your confirmation, and saying plainly "Not yet captured"
        wherever a question has not been answered. Nothing in them is
        invented.
      </p>
      <p className="small muted">{DISCLAIMER}</p>

      <div className="row" style={{ margin: '1.25rem 0' }}>
        <button className="primary" onClick={generate}>
          {docs ? 'Generate again (new version)' : 'Generate the package'}
        </button>
        {docs && (
          <>
            <button onClick={() => toPdf(docs, `${safeName}-succession-package.pdf`)} disabled={pdfBusy}>
              {pdfBusy ? 'Preparing PDF…' : 'Download the whole package (PDF)'}
            </button>
            <button onClick={() => download(`${safeName}-succession-package.md`,
              docs.map((d) => d.markdown).join('\n\n---\n\n'))}>
              Download everything (markdown)
            </button>
            <button onClick={() => download(`${safeName}-knowledge-model.json`,
              exportModel(project.model), 'application/json')}>
              Download the raw record (JSON)
            </button>
          </>
        )}
      </div>
      {pdfError && <p className="small" style={{ color: '#8b2f2f' }}>{pdfError}</p>}

      {docs && docs.map((d) => (
        <div className="card" key={d.id}>
          <p style={{ marginBottom: '0.35rem' }}>{d.title}</p>
          <p className="small muted" style={{ marginBottom: '0.6rem' }}>
            Version {d.version} · generated {new Date(d.generatedAt).toLocaleString()}
          </p>
          <div className="row">
            <button onClick={() => setOpenId(d.id)}>Read</button>
            <button className="quiet" onClick={() => toPdf([d], `${safeName}-${d.id}-v${d.version}.pdf`)} disabled={pdfBusy}>
              PDF
            </button>
            <button className="quiet" onClick={() => download(`${safeName}-${d.id}-v${d.version}.md`, d.markdown)}>
              Markdown
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}
