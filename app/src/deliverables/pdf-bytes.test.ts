import { describe, it, expect } from 'vitest';
import { generatePdfBytes } from './pdf';
import { renderPackage } from './render';
import { fixtureModel } from '../knowledge-model/fixture';
import { PROJECT_FORMAT_VERSION, type ProjectFile } from '../project/store';

/**
 * End-to-end PDF bytes: the full fixture package through pdfmake in a real
 * node environment (no jsdom needed - pdfmake runs headless). Guards the
 * whole chain: renderers -> markdown -> converter -> actual %PDF output with
 * the standard Times fonts (no embedded font files).
 */
describe('PDF: real bytes', () => {
  it('generates a genuine multi-page PDF from the whole fixture package', async () => {
    const project: ProjectFile = {
      formatVersion: PROJECT_FORMAT_VERSION,
      model: JSON.parse(JSON.stringify(fixtureModel)), sessions: [],
    };
    const { rendered } = renderPackage(project);
    const bytes = await generatePdfBytes(rendered);
    const head = new TextDecoder().decode(bytes.slice(0, 8));
    expect(head.startsWith('%PDF-')).toBe(true);
    expect(bytes.length).toBeGreaterThan(10_000);
    const body = new TextDecoder('latin1').decode(bytes);
    // Multi-page (nine documents with page breaks), Times, no TTF embedding:
    expect((body.match(/\/Type\s*\/Page[^s]/g) ?? []).length).toBeGreaterThan(5);
    expect(body).toContain('Times-Roman');
    expect(body).not.toContain('Roboto');
  }, 30_000);
});
