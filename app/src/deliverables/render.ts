import type {
  KnowledgeModel, FactEntity, EntityBase,
} from '../knowledge-model/schema';
import { exportModel } from '../knowledge-model/model';
import { trackSetFor } from '../interview/engine';
import { scoreRisk, SCORING_EXPLANATION } from '../dashboard/metrics';
import type { ProjectFile } from '../project/store';

/**
 * Deliverable generation - Stage 6.
 *
 * Every document renders EXCLUSIVELY from the knowledge model. The Doc
 * helper's c() registers each model-derived string as it is emitted; the
 * automated audit verifies every registered string against the model's
 * field values (see DECISIONS.md). Empty sections say "Not yet captured."
 */

export const DISCLAIMER =
  'This package documents operating knowledge only. It is not financial, ' +
  'tax, legal, or estate planning advice. Work with your CPA, attorney, ' +
  'and exit planner for those matters.';

export const NOT_CAPTURED = 'Not yet captured.';

/**
 * An empty section can mean two very different things, and a report that says
 * "Not yet captured" over work that was deliberately scoped out reads as
 * unfinished work. When the interview never reached an area, say so; "Not yet
 * captured" is reserved for parts that WERE asked and are still waiting on an
 * answer worth recording (see DECISIONS.md 2026-07-16, P7).
 */
export const NOT_ASKED = 'This part of the interview has not been asked yet.';

export interface Rendered {
  id: string;
  title: string;
  version: number;
  generatedAt: string;
  markdown: string;
  /** Every model-derived string emitted, for the line-by-line audit. */
  content: string[];
}

class Doc {
  private lines: string[] = [];
  readonly content: string[] = [];

  /** Register a model-derived string and return it for interpolation. */
  c(text: string): string {
    if (text.trim()) this.content.push(text);
    return text;
  }
  raw(line = ''): void { this.lines.push(line); }
  h2(t: string): void { this.raw(`## ${t}`); this.raw(); }
  h3(t: string): void { this.raw(`### ${t}`); this.raw(); }
  p(line: string): void { this.raw(line); this.raw(); }
  quote(text: string, suffix = ''): void { this.raw(`> ${this.c(text)}${suffix}`); this.raw(); }
  bullet(line: string): void { this.raw(`- ${line}`); }
  gap(): void { this.raw(); }
  notCaptured(): void { this.p(NOT_CAPTURED); }
  toString(): string { return this.lines.join('\n').replace(/\n{3,}/g, '\n\n'); }
}

function mark(e: EntityBase): string {
  const bits: string[] = [];
  if (!e.verified) bits.push('needs verification');
  if (e.confidence === 'low') bits.push('low confidence');
  return bits.length ? ` *(${bits.join('; ')})*` : '';
}

/** True when this model documents the owner rather than one role. */
const isOwnerProject = (project: ProjectFile): boolean => project.model.subjectRole === 'owner';

/**
 * The subject-facing wording and the track/area ids each renderer quotes.
 * Owner projects keep every original string; role projects speak about the
 * role-holder and quote the ROLE_TRACKS areas (interviewed role-holder-first,
 * DECISIONS.md 2026-07-17). The role-holder's NAME never appears in identity
 * lines - the model documents the role; names live in source attribution.
 */
function subjectWords(project: ProjectFile) {
  const owner = isOwnerProject(project);
  return {
    owner,
    theirWords: owner ? "the owner's own words" : "the role-holder's own words",
    decidingTrack: owner ? 'track-5' : 'role-4',
    scarTrack: owner ? 'track-6' : 'role-6',
    annual: owner ? { t: 'track-1', a: 'annual' } : { t: 'role-1', a: 'annual' },
    firstBreak: owner ? { t: 'track-1', a: 'first-break' } : { t: 'role-1', a: 'first-break' },
    changeSlowly: owner ? { t: 'track-8', a: 'change-slowly' } : { t: 'role-7', a: 'change-slowly' },
    neverChange: owner ? { t: 'track-8', a: 'never-change' } : { t: 'role-7', a: 'never-change' },
    callOrder: owner ? { t: 'track-8', a: 'call-order' } : { t: 'role-7', a: 'meet-first' },
  };
}

function header(doc: Doc, title: string, project: ProjectFile, version: number, generatedAt: string): void {
  doc.raw(`# ${title}`);
  doc.raw();
  if (isOwnerProject(project)) {
    doc.p(`${doc.c(project.model.profile.businessName)} · prepared from the words of ${doc.c(project.model.profile.ownerName)}`);
  } else {
    doc.p(`${doc.c(project.model.profile.businessName)} · documenting the role of ${doc.c(project.model.subjectRole)}, in the words of the person who does it`);
  }
  doc.p(`Version ${version} · generated ${new Date(generatedAt).toLocaleDateString()}`);
  doc.p(`*${DISCLAIMER}*`);
  doc.raw('---');
  doc.raw();
}

function topicFacts(model: KnowledgeModel, trackId: string, areaId?: string): FactEntity[] {
  const prefix = areaId ? `${trackId}:${areaId}` : `${trackId}:`;
  return model.entities.facts.filter((f) => (f.topic ?? '').startsWith(prefix));
}

function trackAnswered(project: ProjectFile, trackId: string): boolean {
  return (project.interviewMemory?.trackProgress[trackId]?.answeredAreas.length ?? 0) > 0;
}

function areaAnswered(project: ProjectFile, trackId: string, areaId: string): boolean {
  return project.interviewMemory?.trackProgress[trackId]?.answeredAreas.includes(areaId) ?? false;
}

/** Quote every fact for a track (or one area); when empty, say whether it was even asked. */
function quoteArea(doc: Doc, project: ProjectFile, trackId: string, areaId?: string): void {
  const facts = topicFacts(project.model, trackId, areaId);
  if (facts.length > 0) {
    for (const f of facts) doc.quote(f.statement, mark(f));
    return;
  }
  const asked = areaId ? areaAnswered(project, trackId, areaId) : trackAnswered(project, trackId);
  doc.p(asked ? NOT_CAPTURED : NOT_ASKED);
}

/* ------------------------------------------------------------------ */

function executiveSummary(doc: Doc, project: ProjectFile): void {
  const m = project.model;
  const e = m.entities;
  doc.h2('What has been captured');
  const total =
    e.facts.length + e.processes.length + e.relationships.length + e.decisions.length +
    e.judgments.length + e.history.length + e.systems.length + e.commitments.length + e.risks.length;
  doc.p(`${total} knowledge items are on record: ${e.facts.length} statements in ${subjectWords(project).theirWords}, ` +
    `${e.processes.length} processes, ${e.relationships.length} relationships, ${e.decisions.length} decision types, ` +
    `${e.judgments.length} judgment calls, ${e.history.length} pieces of history, ${e.systems.length} systems, ` +
    `${e.commitments.length} commitments, and ${e.risks.length} identified risks.`);

  doc.h2('Interview coverage');
  const mem = project.interviewMemory;
  for (const t of trackSetFor(m.subjectRole)) {
    const covered = mem?.trackProgress[t.id]?.answeredAreas.length ?? 0;
    doc.bullet(`${t.title}: ${covered} of ${t.areas.length} areas covered`);
  }
  doc.gap();

  doc.h2('What remains at risk');
  const openGaps = e.gaps.filter((g) => g.status !== 'resolved');
  const unverified = [...e.facts, ...e.relationships, ...e.processes].filter((x) => !x.verified).length;
  doc.p(`${e.risks.length} risks are on record, ${openGaps.length} questions remain open, ` +
    `and ${unverified} captured items have not yet been confirmed by the owner. ` +
    `The Knowledge Risk Report lists each one.`);
}

function handbook(doc: Doc, project: ProjectFile): void {
  const m = project.model;
  doc.p(`Everything below is in ${subjectWords(project).theirWords}, organized by the part of the ${isOwnerProject(project) ? 'business' : 'job'} it describes.`);
  for (const t of trackSetFor(m.subjectRole)) {
    const facts = topicFacts(m, t.id);
    doc.h2(t.title);
    if (facts.length === 0) {
      doc.p(trackAnswered(project, t.id) ? NOT_CAPTURED : NOT_ASKED);
      continue;
    }
    for (const area of t.areas) {
      const areaFacts = topicFacts(m, t.id, area.id);
      if (areaFacts.length === 0) continue;
      doc.h3(area.question);
      for (const f of areaFacts) doc.quote(f.statement, mark(f));
    }
  }
  const otherFacts = m.entities.facts.filter(
    (f) => !(f.topic ?? '').startsWith('track-') && f.sources[0]?.kind !== 'document');
  doc.h2('Other knowledge on record');
  if (otherFacts.length === 0) doc.notCaptured();
  else for (const f of otherFacts) doc.quote(f.statement, `${f.topic ? ` — ${doc.c(f.topic)}` : ''}${mark(f)}`);
  // Document lines render grouped and compact: a 500-line SOP as 500 separate
  // blockquotes tripled the page count and buried the interview knowledge.
  // Every line is still here verbatim, and full per-line attribution (document
  // id + line number) remains on each fact and in the AI export.
  const docFacts = m.entities.facts.filter((f) => f.sources[0]?.kind === 'document');
  doc.h2('From the business\'s own documents');
  if (docFacts.length === 0) doc.notCaptured();
  else {
    const byDoc = new Map<string, FactEntity[]>();
    for (const f of docFacts) {
      const key = f.sources[0].documentId ?? '';
      const group = byDoc.get(key);
      if (group) group.push(f); else byDoc.set(key, [f]);
    }
    for (const [docId, facts] of byDoc) {
      doc.h3(project.documents?.find((d) => d.id === docId)?.name ?? 'Document');
      for (const f of facts) doc.bullet(`${doc.c(f.statement)}${mark(f)}`);
      doc.gap();
    }
  }
}

function relationshipMap(doc: Doc, project: ProjectFile): void {
  const rels = project.model.entities.relationships;
  if (rels.length === 0) {
    doc.notCaptured();
    doc.p('Relationships appear here once captured. Interview answers that describe relationships are preserved in the Successor\'s Handbook meanwhile.');
    return;
  }
  for (const r of rels) {
    doc.h2(`${doc.c(r.who)}${mark(r)}`);
    doc.bullet(`Kind: ${doc.c(r.category)}`);
    doc.bullet(`Why they matter: ${doc.c(r.whyTheyMatter)}`);
    doc.bullet(`History: ${doc.c(r.history)}`);
    doc.bullet(`What they expect: ${doc.c(r.whatTheyExpect)}`);
    doc.bullet(`Transfer risk: ${doc.c(r.transferRisk)} · transfer plan: ${doc.c(r.transferPlanStatus)}`);
    doc.gap();
  }
}

function decisionPlaybook(doc: Doc, project: ProjectFile): void {
  const m = project.model;
  const decisions = m.entities.decisions;
  doc.h2('Recurring decisions');
  if (decisions.length === 0) doc.notCaptured();
  for (const d of decisions) {
    doc.h3(`${doc.c(d.name)}${mark(d)}`);
    doc.p(`How it is decided: ${doc.c(d.howDecided)}`);
    if (d.realCriteria.length) { doc.p('The real criteria:'); for (const cr of d.realCriteria) doc.bullet(doc.c(cr)); doc.gap(); }
    if (d.thresholds.length) { doc.p('Thresholds:'); for (const th of d.thresholds) doc.bullet(doc.c(th)); doc.gap(); }
    for (const ex of d.examples) {
      doc.p(`Worked example: ${doc.c(ex.situation)} — decided: ${doc.c(ex.whatWasDecided)}${ex.outcome ? ` — outcome: ${doc.c(ex.outcome)}` : ''}`);
    }
  }
  const sw = subjectWords(project);
  doc.h2(sw.owner ? 'Judgment calls - the owner\'s instincts' : 'Judgment calls - the role-holder\'s instincts');
  const j = m.entities.judgments;
  if (j.length === 0) doc.notCaptured();
  for (const call of j) doc.quote(call.heuristic, `${call.context ? ` — ${doc.c(call.context)}` : ''}${mark(call)}`);
  doc.h2(`In ${sw.theirWords} on deciding`);
  quoteArea(doc, project, sw.decidingTrack);
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

/**
 * Three month names are also ordinary English words ("we may need to", "a long
 * march", "an august institution"). A plain case-insensitive substring match
 * filed every "may" under May. Those three are matched case-SENSITIVELY -
 * months are proper nouns and an owner writing about May capitalizes it - while
 * the nine unambiguous names stay case-insensitive so a lowercase "january"
 * still lands. Word boundaries keep "May" out of "Mayfair".
 */
const AMBIGUOUS_MONTHS = new Set(['March', 'May', 'August']);

const monthMatcher = (month: string): RegExp =>
  new RegExp(`\\b${month}\\b`, AMBIGUOUS_MONTHS.has(month) ? '' : 'i');

export function factsMentioningMonth(facts: FactEntity[], month: string): FactEntity[] {
  const re = monthMatcher(month);
  return facts.filter((f) => re.test(f.statement));
}

function firstYear(doc: Doc, project: ProjectFile): void {
  const m = project.model;
  const sw = subjectWords(project);
  doc.h2(`The annual rhythm in ${sw.theirWords}`);
  quoteArea(doc, project, sw.annual.t, sw.annual.a);
  doc.h2('Month by month');
  doc.p('Every statement on record that names a month, placed on the calendar. Months with nothing listed are not empty months - they are months nothing has been captured about yet.');
  for (const month of MONTH_NAMES) {
    const hits = factsMentioningMonth(m.entities.facts, month);
    doc.h3(month);
    if (hits.length === 0) doc.p(NOT_CAPTURED);
    else for (const f of hits) doc.quote(f.statement, mark(f));
  }
  doc.h2('What to change slowly');
  quoteArea(doc, project, sw.changeSlowly.t, sw.changeSlowly.a);
  doc.h2('What should never change');
  quoteArea(doc, project, sw.neverChange.t, sw.neverChange.a);
}

function memoryArchive(doc: Doc, project: ProjectFile): void {
  const m = project.model;
  doc.h2('History on record');
  const h = m.entities.history;
  if (h.length === 0) doc.notCaptured();
  for (const item of h) {
    doc.p(`**${doc.c(item.when)}** — ${doc.c(item.whatHappened)}${mark(item)}`);
    doc.p(`What was learned: ${doc.c(item.whatWasLearned)}`);
  }
  doc.h2(`Scar tissue, in ${subjectWords(project).theirWords}`);
  quoteArea(doc, project, subjectWords(project).scarTrack);
  doc.h2('Commitments and handshakes');
  const c = m.entities.commitments;
  if (c.length === 0) doc.notCaptured();
  for (const item of c) {
    doc.bullet(`With ${doc.c(item.withWhom)}: ${doc.c(item.whatWasPromised)} (${item.writtenDown ? 'written down' : 'not written down'})${mark(item)}`);
  }
  doc.gap();
}

function emergencyBrief(doc: Doc, project: ProjectFile): void {
  const m = project.model;
  const sw = subjectWords(project);
  doc.h2('What breaks first');
  quoteArea(doc, project, sw.firstBreak.t, sw.firstBreak.a);
  doc.h2('Single points of failure on record');
  const spofs = m.entities.risks.filter((r) => r.riskKind.toLowerCase().includes('single'));
  if (spofs.length === 0) doc.notCaptured();
  for (const r of spofs) {
    doc.bullet(`${doc.c(r.description)}${mark(r)}`);
    if (r.impact && r.impact !== 'Not yet captured') doc.bullet(`  Impact: ${doc.c(r.impact)}`);
  }
  doc.gap();
  doc.h2(sw.owner ? 'Who to call, in the owner\'s words' : 'Who to call and meet first, in the role-holder\'s words');
  quoteArea(doc, project, sw.callOrder.t, sw.callOrder.a);
  doc.h2('Key relationships to contact');
  const rels = m.entities.relationships;
  if (rels.length === 0) doc.notCaptured();
  for (const r of rels) doc.bullet(`${doc.c(r.who)} (${doc.c(r.category)}) — ${doc.c(r.whatTheyExpect)}${mark(r)}`);
  doc.gap();
  doc.h2('Systems and where access lives');
  const sys = m.entities.systems;
  if (sys.length === 0) doc.notCaptured();
  for (const s of sys) {
    doc.bullet(`${doc.c(s.name)} (${doc.c(s.kind)}): ${doc.c(s.whatItDoes)} — access: ${doc.c(s.accessHeldBy)}${mark(s)}`);
  }
  doc.gap();
  doc.p('*No passwords or account numbers are stored anywhere in this package, by design.*');
}

function riskReport(doc: Doc, project: ProjectFile): void {
  const m = project.model;
  doc.h2('Risks on record, scored');
  doc.p(`*${SCORING_EXPLANATION}*`);
  if (m.entities.risks.length === 0) doc.notCaptured();
  const scored = m.entities.risks.map(scoreRisk).sort((a, b) => b.score - a.score);
  for (const s of scored) {
    const r = s.risk;
    doc.h3(`${s.score} (${s.band}) — ${doc.c(r.riskKind)}${mark(r)}`);
    doc.p(doc.c(r.description));
    doc.p(`Impact: ${doc.c(r.impact)}`);
    if (r.mitigation) doc.p(`Mitigation on record: ${doc.c(r.mitigation)}`);
    doc.p(`*How this score was reached: ${s.reasons.join('; ')}.*`);
  }
  doc.h2('Open questions');
  const open = m.entities.gaps.filter((g) => g.status !== 'resolved');
  doc.p(`${open.length} question${open.length === 1 ? '' : 's'} remain open. Each one is knowledge the successor does not yet have.`);
  if (open.length === 0) doc.p('Nothing is waiting.');
  for (const g of open) doc.bullet(doc.c(g.question));
  doc.gap();
}

function aiExport(doc: Doc, project: ProjectFile): void {
  doc.p('The complete knowledge model in structured JSON, for future AI enablement. This is the same lossless format the app exports and imports.');
  doc.raw('```json');
  doc.raw(exportModel(project.model));
  doc.raw('```');
}

/* ------------------------------------------------------------------ */

interface Def { id: string; title: string; render: (doc: Doc, project: ProjectFile) => void; }

export const DELIVERABLES: Def[] = [
  { id: 'executive-summary', title: 'Executive Knowledge Summary', render: executiveSummary },
  { id: 'handbook', title: "The Successor's Handbook", render: handbook },
  { id: 'relationship-map', title: 'Relationship Transfer Map', render: relationshipMap },
  { id: 'decision-playbook', title: 'Decision Playbook', render: decisionPlaybook },
  { id: 'first-year', title: 'First Year Without the Founder', render: firstYear },
  { id: 'memory-archive', title: 'Institutional Memory Archive', render: memoryArchive },
  { id: 'emergency-brief', title: 'Continuity & Emergency Brief', render: emergencyBrief },
  { id: 'risk-report', title: 'Knowledge Risk Report', render: riskReport },
  { id: 'ai-export', title: 'AI-Ready Knowledge Export', render: aiExport },
];

/**
 * Role projects keep the same nine documents and ids (so versions and
 * navigation behave identically) but three titles change to speak about the
 * job rather than the founder. Same renderers - each is already
 * subject-aware via subjectWords().
 */
const ROLE_TITLES: Record<string, string> = {
  'handbook': 'The Role Handbook',
  'first-year': 'The First Year in the Role',
  'relationship-map': 'Relationship & Handoff Map',
};

export function deliverablesFor(project: ProjectFile): Def[] {
  if (isOwnerProject(project)) return DELIVERABLES;
  return DELIVERABLES.map((d) => ({ ...d, title: ROLE_TITLES[d.id] ?? d.title }));
}

export function renderDeliverable(def: Def, project: ProjectFile, version: number): Rendered {
  const generatedAt = new Date().toISOString();
  const doc = new Doc();
  header(doc, def.title, project, version, generatedAt);
  def.render(doc, project);
  return {
    id: def.id, title: def.title, version, generatedAt,
    markdown: doc.toString(), content: doc.content,
  };
}

export function renderPackage(project: ProjectFile): { rendered: Rendered[]; versions: Record<string, number> } {
  const versions = { ...(project.deliverableVersions ?? {}) };
  const rendered = deliverablesFor(project).map((d) => {
    versions[d.id] = (versions[d.id] ?? 0) + 1;
    return renderDeliverable(d, project, versions[d.id]);
  });
  return { rendered, versions };
}

/** All string values in the model, for the zero-invention audit. */
export function modelStrings(model: KnowledgeModel): Set<string> {
  const out = new Set<string>();
  const walk = (v: unknown): void => {
    if (typeof v === 'string') { if (v.trim()) out.add(v); return; }
    if (Array.isArray(v)) { v.forEach(walk); return; }
    if (typeof v === 'object' && v !== null) Object.values(v).forEach(walk);
  };
  walk(model);
  return out;
}

/** Verify every registered content string exists verbatim in the model. */
export function auditRendered(rendered: Rendered, model: KnowledgeModel): string[] {
  const known = modelStrings(model);
  return rendered.content.filter((text) => !known.has(text));
}
