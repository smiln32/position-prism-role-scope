import type { KnowledgeModel, FactEntity, GapEntity } from '../knowledge-model/schema';
import { newId } from '../knowledge-model/model';
import { detectUndefinedNames, profileNames } from '../interview/engine';

/**
 * Document analysis - Stage 5. Rule-based (see DECISIONS.md rulings).
 *
 * Extraction: every non-empty line becomes a Fact verbatim, attributed to
 * the document and line number. Names without introduction become Gaps.
 * Cross-reference: document lines are compared against interview facts;
 * lines that clearly discuss the same thing but carry different months or
 * numbers surface as conflict Gaps quoting both sides verbatim.
 * The engine never paraphrases and never deletes.
 */

export interface ProjectDocument {
  id: string;
  name: string;
  addedAt: string;
  text: string;
}

export interface AnalysisReport {
  documentId: string;
  factsAdded: number;
  nameGaps: number;
  conflicts: number;
  linesSkipped: number;
  /** Name gaps past MAX_NAME_GAPS. Reported, never silent (see below). */
  nameGapsSuppressed: number;
}

const MAX_LINES = 500;

/**
 * A ceiling on name questions per document. The detector is built for prose: a
 * vendor list or a price sheet is nothing BUT proper nouns, so one upload could
 * bury the dashboard's open questions under dozens of "Who or what is X?".
 * Past this many, further names are counted and reported rather than raised -
 * the same bargain MAX_LINES already makes. The facts themselves are never
 * capped; nothing captured is lost, only the questions about it.
 */
const MAX_NAME_GAPS = 25;

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'so', 'of', 'in', 'on', 'at', 'to',
  'for', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'it', 'its', 'this', 'that', 'these', 'those', 'we', 'our', 'us', 'they',
  'their', 'them', 'he', 'she', 'his', 'her', 'i', 'my', 'me', 'you', 'your',
  'not', 'no', 'do', 'does', 'did', 'have', 'has', 'had', 'will', 'would',
  'can', 'could', 'much', 'without', 'before', 'after', 'each', 'every',
]);

function contentWords(text: string): Set<string> {
  return new Set(
    text.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w) && !MONTHS.includes(w) && !/^\d+$/.test(w)),
  );
}

function monthSet(text: string): Set<string> {
  const lower = text.toLowerCase();
  return new Set(MONTHS.filter((m) => lower.includes(m)));
}

function numberSet(text: string): Set<string> {
  return new Set((text.match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => n.replace(/,/g, '')));
}

function disjointNonEmpty(a: Set<string>, b: Set<string>): boolean {
  if (a.size === 0 || b.size === 0) return false;
  for (const x of a) if (b.has(x)) return false;
  return true;
}

/** True when two statements plainly discuss the same thing but disagree. */
export function isConflict(docLine: string, interviewFact: string): boolean {
  const wa = contentWords(docLine);
  const wb = contentWords(interviewFact);
  let overlap = 0;
  for (const w of wa) if (wb.has(w)) overlap++;
  if (overlap < 3) return false;
  return (
    disjointNonEmpty(monthSet(docLine), monthSet(interviewFact)) ||
    disjointNonEmpty(numberSet(docLine), numberSet(interviewFact))
  );
}

export interface AnalyzeResult {
  model: KnowledgeModel;
  knownNames: string[];
  report: AnalysisReport;
}

/**
 * Extract a document into the model and surface conflicts against
 * interview knowledge. Pure: returns new model, mutates nothing.
 */
export function analyzeDocument(
  model: KnowledgeModel,
  knownNames: string[],
  doc: ProjectDocument,
): AnalyzeResult {
  const now = new Date().toISOString();
  const next: KnowledgeModel = JSON.parse(JSON.stringify(model));
  const names = [...knownNames];
  const report: AnalysisReport = {
    documentId: doc.id, factsAdded: 0, nameGaps: 0, conflicts: 0, linesSkipped: 0,
    nameGapsSuppressed: 0,
  };
  const known = profileNames(next);

  const interviewFacts = next.entities.facts.filter(
    (f) => f.sources.some((s) => s.kind === 'interview'),
  );

  const allLines = doc.text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const lines = allLines.slice(0, MAX_LINES);
  report.linesSkipped = allLines.length - lines.length;

  lines.forEach((line, i) => {
    const detail = `${doc.name}, line ${i + 1}`;
    const fact: FactEntity = {
      id: newId('fact'), type: 'fact', confidence: 'high',
      sources: [{ kind: 'document', documentId: doc.id, detail, capturedAt: now }],
      createdAt: now, updatedAt: now, verified: false,
      statement: line,
      topic: `document:${doc.id}`,
    };
    next.entities.facts.push(fact);
    report.factsAdded++;

    for (const name of detectUndefinedNames(line, [...names, ...known])) {
      names.push(name);
      if (report.nameGaps >= MAX_NAME_GAPS) { report.nameGapsSuppressed++; continue; }
      next.entities.gaps.push({
        id: newId('gap'), type: 'gap', confidence: 'high',
        sources: [{ kind: 'inferred', detail: `Name "${name}" appears without introduction (${detail})`, capturedAt: now }],
        createdAt: now, updatedAt: now, verified: false,
        question: `Who or what is "${name}"?`,
        raisedBecause: 'Appears in an uploaded document without explanation',
        status: 'queued',
        relatedIds: [fact.id],
      } satisfies GapEntity);
      report.nameGaps++;
    }

    // Cross-reference: first clear disagreement with interview knowledge wins.
    const clash = interviewFacts.find((f) => isConflict(line, f.statement));
    if (clash) {
      next.entities.gaps.push({
        id: newId('gap'), type: 'gap', confidence: 'high',
        sources: [{ kind: 'inferred', detail: `Document/interview disagreement (${detail})`, capturedAt: now }],
        createdAt: now, updatedAt: now, verified: false,
        question: `The document says: "${line}" You said: "${clash.statement}" Which is right, or are both true?`,
        raisedBecause: 'A document and an interview answer disagree',
        status: 'queued',
        // Order matters for resolution: [interview fact, document fact].
        relatedIds: [clash.id, fact.id],
      } satisfies GapEntity);
      report.conflicts++;
    }
  });

  next.updatedAt = now;
  return { model: next, knownNames: names, report };
}

export type ConflictChoice = 'document' | 'interview' | 'both';

/** A conflict gap plus the two statements it refers to, for display. */
export interface ConflictView {
  gapId: string;
  interviewStatement: string;
  documentStatement: string;
}

export function listOpenConflicts(model: KnowledgeModel): ConflictView[] {
  const byId = new Map(model.entities.facts.map((f) => [f.id, f]));
  return model.entities.gaps
    .filter((g) => g.status !== 'resolved' && g.raisedBecause === 'A document and an interview answer disagree')
    .map((g) => ({
      gapId: g.id,
      interviewStatement: byId.get(g.relatedIds[0])?.statement ?? '(missing)',
      documentStatement: byId.get(g.relatedIds[1])?.statement ?? '(missing)',
    }));
}

/**
 * Owner-directed resolution (attributable modification, DECISIONS.md):
 * the chosen statement is verified; the other drops to low confidence;
 * "both" verifies both. The gap resolves. Nothing is deleted.
 */
export function resolveConflict(
  model: KnowledgeModel,
  gapId: string,
  choice: ConflictChoice,
): KnowledgeModel {
  const now = new Date().toISOString();
  const next: KnowledgeModel = JSON.parse(JSON.stringify(model));
  const gap = next.entities.gaps.find((g) => g.id === gapId);
  if (!gap) throw new Error(`No such conflict: ${gapId}`);
  const interviewFact = next.entities.facts.find((f) => f.id === gap.relatedIds[0]);
  const docFact = next.entities.facts.find((f) => f.id === gap.relatedIds[1]);
  if (!interviewFact || !docFact) throw new Error('Conflict facts are missing from the model.');

  if (choice === 'both') {
    interviewFact.verified = true;
    docFact.verified = true;
  } else {
    const chosen = choice === 'document' ? docFact : interviewFact;
    const other = choice === 'document' ? interviewFact : docFact;
    chosen.verified = true;
    other.confidence = 'low';
    other.updatedAt = now;
  }
  (choice === 'both' ? [interviewFact, docFact] : []).forEach((f) => (f.updatedAt = now));
  gap.status = 'resolved';
  gap.updatedAt = now;
  next.updatedAt = now;
  return next;
}
