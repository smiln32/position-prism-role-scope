import { describe, it, expect } from 'vitest';
import { parseInline, markdownToPdfContent, docDefinitionFor, type PdfText, type PdfList } from './pdf';
import { renderDeliverable, DELIVERABLES } from './render';
import { fixtureModel } from '../knowledge-model/fixture';
import { PROJECT_FORMAT_VERSION, type ProjectFile } from '../project/store';

/**
 * Real PDF export (2026-07-17, DECISIONS.md). The converter is pure and only
 * reshapes the markdown our own Doc generator emits - these tests pin that
 * subset. Actual PDF bytes are exercised by scripts/pdf-smoke.mjs (node),
 * since pdfmake needs a fuller environment than jsdom.
 */
describe('PDF: inline markdown', () => {
  it('passes plain text through', () => {
    expect(parseInline('plain words')).toEqual([{ text: 'plain words' }]);
  });
  it('parses the verification markers as italics', () => {
    expect(parseInline('quoted words *(needs verification)*')).toEqual([
      { text: 'quoted words ' }, { text: '(needs verification)', italics: true },
    ]);
  });
  it('parses bold runs (memory archive dates)', () => {
    expect(parseInline('**2011** — what happened')).toEqual([
      { text: '2011', bold: true }, { text: ' — what happened' },
    ]);
  });
});

describe('PDF: block conversion', () => {
  it('maps headings, quotes, bullets, rules and paragraphs', () => {
    const md = '# Title\n\n## Section\n\n### A question?\n\n> a verbatim answer *(needs verification)*\n\n- one\n- two\n\n---\n\nplain paragraph';
    const content = markdownToPdfContent(md);
    const texts = content.filter((c): c is PdfText => 'text' in c);
    expect((texts[0].text as string)).toBe('Title');
    expect(texts[0].fontSize).toBe(19);
    expect((texts[1].text as string)).toBe('Section');
    // The quote is indented and carries the italic marker inline:
    const quote = texts.find((t) => Array.isArray(t.text) && t.text.some((s) => s.italics));
    expect(quote?.margin?.[0]).toBe(16);
    const list = content.find((c): c is PdfList => 'ul' in c);
    expect(list?.ul.length).toBe(2);
    expect(content.some((c) => 'canvas' in c)).toBe(true);
  });

  it('renders fenced code as Courier and never drops lines', () => {
    const md = '```json\n{\n  "a": 1\n}\n```';
    const [block] = markdownToPdfContent(md) as PdfText[];
    expect(block.font).toBe('Courier');
    expect(block.text).toBe('{\n  "a": 1\n}');
  });

  it('converts a real rendered deliverable without losing content lines', () => {
    const project: ProjectFile = {
      formatVersion: PROJECT_FORMAT_VERSION,
      model: JSON.parse(JSON.stringify(fixtureModel)), sessions: [],
    };
    const rendered = renderDeliverable(DELIVERABLES[1], project, 1); // the handbook
    const content = markdownToPdfContent(rendered.markdown);
    expect(content.length).toBeGreaterThan(10);
    // Every non-empty, non-syntax markdown line survives into some block:
    const flat = JSON.stringify(content);
    for (const line of rendered.content.slice(0, 20)) {
      expect(flat).toContain(JSON.stringify(line).slice(1, -1).slice(0, 40));
    }
  });

  it('a package gets a page break before every document but the first', () => {
    const project: ProjectFile = {
      formatVersion: PROJECT_FORMAT_VERSION,
      model: JSON.parse(JSON.stringify(fixtureModel)), sessions: [],
    };
    const docs = [renderDeliverable(DELIVERABLES[0], project, 1), renderDeliverable(DELIVERABLES[1], project, 1)];
    const dd = docDefinitionFor(docs) as { content: PdfText[] };
    const breaks = dd.content.filter((c) => c.pageBreak === 'before');
    expect(breaks.length).toBe(1);
  });
});
