import type { KnowledgeModel, FactEntity, GapEntity, RiskEntity } from '../knowledge-model/schema';
import { newId } from '../knowledge-model/model';

/**
 * Interview engine - Stage 4: all eight tracks, cross-session memory,
 * contradiction detection. Rule-based (see DECISIONS.md rulings).
 *
 * Knowledge integrity: Facts are the owner's answers verbatim. Gaps and
 * Risks are the only inferred entities, always labeled 'inferred' with the
 * trigger recorded. Contradiction gaps quote both answers verbatim.
 */

export interface TrackArea { id: string; question: string; }
export interface TrackDef { id: string; n: number; title: string; areas: TrackArea[]; }

export const TRACKS: TrackDef[] = [
  {
    id: 'track-1', n: 1, title: 'The Business As It Really Runs',
    areas: [
      { id: 'daily', question: 'Walk me through a normal working day, from when you arrive to when you leave. What do you actually do?' },
      { id: 'weekly', question: 'What do you handle every week that keeps the place running - the things that happen because you make them happen?' },
      { id: 'annual', question: 'Across a full year, what are the seasons, deadlines, and rhythms that only you keep track of?' },
      { id: 'owner-only', question: 'What are the things only you do - work nobody else knows how to do, or is allowed to do?' },
      { id: 'first-break', question: 'If you were away for a month starting tomorrow, what would break first?' },
      { id: 'tools', question: 'Which systems, software, or pieces of equipment do you personally touch, and what do you use each one for?' },
      { id: 'people', question: 'Who do you lean on most inside the business day to day, and for what?' },
      { id: 'unwritten', question: 'What parts of your day never show up on a schedule or a job description, but matter?' },
    ],
  },
  {
    id: 'track-2', n: 2, title: 'Customers & Revenue Truths',
    areas: [
      { id: 'why-stay', question: 'Think about your best customers. Why do they really stay - not the brochure answer, the real one?' },
      { id: 'personal', question: 'Which customer relationships are personal to you - the ones that might not survive your leaving?' },
      { id: 'pricing', question: 'How do prices really get set here? Walk me through the last time you priced something significant.' },
      { id: 'protect', question: 'Which customers should the next person protect at all costs, and what does protecting them look like?' },
      { id: 'let-go', question: 'Are there customers you would quietly let go, or never take back? Why?' },
      { id: 'revenue-truths', question: 'What is true about where the money actually comes from that is not obvious from the books?' },
    ],
  },
  {
    id: 'track-3', n: 3, title: 'Vendors, Partners & the Outside World',
    areas: [
      { id: 'suppliers', question: 'Who are the suppliers you could not easily replace, and what does each relationship rest on?' },
      { id: 'banker', question: 'Tell me about your banker - who they are, what they have done for you, and what they expect.' },
      { id: 'landlord', question: 'What should the next person know about the landlord, the lease, and how that relationship really works?' },
      { id: 'advisors', question: 'Who are the outside people you rely on - insurance, accountant, lawyer, anyone else - and for what?' },
      { id: 'handshake', question: 'What agreements exist only on a handshake or a phone call - terms nobody could find in a file?' },
      { id: 'call-first', question: 'When something breaks - equipment, supply, money - who do you call first, and why them?' },
    ],
  },
  {
    id: 'track-4', n: 4, title: 'People & the Inside World',
    areas: [
      { id: 'key-people', question: 'Who are the people this business could not run without, and what does each of them carry?' },
      { id: 'knowledge-map', question: 'Who knows what? Where does important knowledge sit with just one person?' },
      { id: 'could-grow', question: 'Who could grow into more than they are doing today, and what would it take?' },
      { id: 'leaves-with-you', question: 'Who might leave when you do, honestly? What would keep them?' },
      { id: 'unwritten-rules', question: 'What are the unwritten rules of this place - the things everyone knows but nobody wrote down?' },
      { id: 'hard-conversations', question: 'Which people-decisions have you been putting off that the next person will inherit?' },
    ],
  },
  {
    id: 'track-5', n: 5, title: 'Decisions & Judgment',
    areas: [
      { id: 'big-decisions', question: 'When a big decision comes up, how do you actually make it? Walk me through your last one.' },
      { id: 'thresholds', question: 'What are your rules of thumb with numbers - the thresholds where your answer changes?' },
      { id: 'instincts', question: 'What do your instincts tell you that a spreadsheet never would? Give me one example.' },
      { id: 'saying-no', question: 'What do you say no to automatically, and why?' },
      { id: 'worked-example', question: 'Tell me about a decision you got right that others would have gotten wrong. What did you see?' },
      { id: 'regret-test', question: 'Is there a decision you would make differently today? What changed your mind?' },
    ],
  },
  {
    id: 'track-6', n: 6, title: 'History & Scar Tissue',
    areas: [
      { id: 'tried-failed', question: 'What have you tried over the years that failed? Pick the one that taught you the most.' },
      { id: 'near-death', question: 'Has the business ever nearly gone under? What happened, and what saved it?' },
      { id: 'why-this-way', question: 'What do you do in a way that looks odd from outside but exists for a reason? Tell me the reason.' },
      { id: 'expensive-lesson', question: 'What was your most expensive lesson - in money, time, or trust?' },
      { id: 'almost-worked', question: 'What almost worked - something you would tell the next person not to write off too quickly?' },
      { id: 'old-wounds', question: 'Are there old wounds - with people, customers, or vendors - the next person could step on without knowing?' },
    ],
  },
  {
    id: 'track-7', n: 7, title: 'Risks & Fragilities',
    areas: [
      { id: 'keeps-up', question: 'What keeps you up at night about this business right now?' },
      { id: 'single-points', question: 'Where does everything depend on one person, one customer, one machine, or one relationship?' },
      { id: 'diligence', question: 'If a buyer went digging tomorrow, what would they find that worries you?' },
      { id: 'fragile', question: 'What is more fragile than it looks from the outside?' },
      { id: 'slow-leaks', question: 'What problems are slow leaks - not urgent today, but costly if ignored for two years?' },
      { id: 'outside-shocks', question: 'Which outside changes - a lost supplier, a rule change, a competitor move - would hurt most?' },
    ],
  },
  {
    id: 'track-8', n: 8, title: 'The Handoff',
    areas: [
      { id: 'advice', question: 'If you could sit your successor down for one hour, what would you tell them?' },
      { id: 'first-90', question: 'What should their first ninety days look like? What should they do, and not do?' },
      { id: 'change-slowly', question: 'What will they want to change immediately that they should change slowly instead?' },
      { id: 'never-change', question: 'What should never change here, no matter who is in charge?' },
      { id: 'call-order', question: 'The first week you are gone, who should they call to introduce themselves, and in what order?' },
      { id: 'final-word', question: 'When you picture handing over the keys, what do you most want to be true a year later?' },
    ],
  },
];

export function trackById(trackId: string): TrackDef {
  const t = TRACKS.find((t) => t.id === trackId);
  if (!t) throw new Error(`Unknown track: ${trackId}`);
  return t;
}

export interface QA {
  trackId: string;
  areaId: string;
  question: string;
  answer: string;
  answeredAt: string;
}

export interface FollowUp {
  trackId: string;
  areaId: string;
  question: string;
  reason: string;
}

/** Project-level interview memory - persists across sessions. */
export interface ProjectInterviewMemory {
  trackProgress: Record<string, { answeredAreas: string[] }>;
  pendingThreads: FollowUp[];
  knownNames: string[];
  answerCount: number;
}

export interface NextQuestion {
  trackId: string;
  areaId: string;
  question: string;
  isFollowUp: boolean;
  /** Set when the thread came from a different track than the one selected. */
  fromTrackTitle?: string;
  reason?: string;
  coverage: { covered: number; total: number };
  trackComplete: boolean;
  allComplete: boolean;
}

export interface IngestResult {
  memory: ProjectInterviewMemory;
  model: KnowledgeModel;
  qa: QA;
  extracted: { facts: number; gaps: number; risks: number; contradictions: number };
}

const SHORT_ANSWER_WORDS = 12;

const NAME_STOPLIST = new Set([
  'I', 'Im', 'Ive', 'Id', 'Ill', 'The', 'A', 'An', 'And', 'But', 'Or', 'So', 'Then',
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
  'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December',
  'God', 'Lord', 'American', 'America', 'English',
  'Nobody', 'Nothing', 'Everyone', 'Everything', 'Someone', 'Something',
  'Christmas', 'Thanksgiving', 'Easter', 'New', 'Year',
]);

const ONLY_ME_PATTERNS = [
  /only (i|me)\b/i,
  /\bno ?one else\b/i,
  /\bnobody else\b/i,
  /\bjust me\b/i,
  /\bi'?m the only one\b/i,
];

function sentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
}

export function detectUndefinedNames(answer: string, known: string[]): string[] {
  const knownLower = new Set(known.map((k) => k.toLowerCase()));
  const found: string[] = [];
  for (const s of sentences(answer)) {
    s.split(/\s+/).forEach((raw, idx) => {
      const word = raw.replace(/[^A-Za-z']/g, '');
      if (idx === 0) return;
      if (!/^[A-Z][a-zA-Z']+$/.test(word)) return;
      if (NAME_STOPLIST.has(word.replace(/'/g, ''))) return;
      if (knownLower.has(word.toLowerCase())) return;
      if (found.some((f) => f.toLowerCase() === word.toLowerCase())) return;
      found.push(word);
    });
  }
  return found;
}

const normText = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();

/**
 * The contract every interview engine honors. Methods that a networked
 * engine must perform asynchronously return `T | Promise<T>` so the
 * synchronous rule-based engine satisfies the same interface without change;
 * callers `await` the result either way. The rule-based engine is the
 * always-available default and the no-key fallback (see DECISIONS.md).
 */
export interface InterviewEngine {
  createMemory(): ProjectInterviewMemory;
  coverage(memory: ProjectInterviewMemory, trackId: string): { covered: number; total: number };
  allComplete(memory: ProjectInterviewMemory): boolean;
  revisitQuestion(trackId: string, areaId: string): string;
  nextQuestion(memory: ProjectInterviewMemory, trackId: string): NextQuestion | Promise<NextQuestion>;
  ingestAnswer(
    memory: ProjectInterviewMemory,
    model: KnowledgeModel,
    sessionId: string,
    trackId: string,
    answer: string,
    revisitAreaId?: string,
  ): IngestResult | Promise<IngestResult>;
}

export class RuleBasedEngine implements InterviewEngine {
  createMemory(): ProjectInterviewMemory {
    return { trackProgress: {}, pendingThreads: [], knownNames: [], answerCount: 0 };
  }

  private progress(memory: ProjectInterviewMemory, trackId: string) {
    return memory.trackProgress[trackId] ?? { answeredAreas: [] };
  }

  coverage(memory: ProjectInterviewMemory, trackId: string) {
    const t = trackById(trackId);
    return { covered: this.progress(memory, trackId).answeredAreas.length, total: t.areas.length };
  }

  allComplete(memory: ProjectInterviewMemory): boolean {
    return (
      memory.pendingThreads.length === 0 &&
      TRACKS.every((t) => this.progress(memory, t.id).answeredAreas.length === t.areas.length)
    );
  }

  /**
   * Next question for the selected track. Order: unresolved threads for this
   * track (oldest first), then uncovered areas, then unresolved threads from
   * other tracks (so nothing is ever forgotten), then done.
   */
  nextQuestion(memory: ProjectInterviewMemory, trackId: string): NextQuestion {
    const track = trackById(trackId);
    const coverage = this.coverage(memory, trackId);
    const base = { trackId, coverage, allComplete: this.allComplete(memory) };

    const own = memory.pendingThreads.find((f) => f.trackId === trackId);
    if (own) {
      return { ...base, areaId: own.areaId, question: own.question, isFollowUp: true, reason: own.reason, trackComplete: false };
    }
    const answered = this.progress(memory, trackId).answeredAreas;
    const nextArea = track.areas.find((a) => !answered.includes(a.id));
    if (nextArea) {
      return { ...base, areaId: nextArea.id, question: nextArea.question, isFollowUp: false, trackComplete: false };
    }
    const other = memory.pendingThreads[0];
    if (other) {
      return {
        ...base, trackId: other.trackId, areaId: other.areaId, question: other.question,
        isFollowUp: true, reason: other.reason, fromTrackTitle: trackById(other.trackId).title,
        trackComplete: true,
      };
    }
    return {
      ...base, areaId: 'done',
      question: this.allComplete(memory)
        ? 'Every part of the interview is covered and nothing is left waiting. Thank you - this is the knowledge a successor will need.'
        : 'This part of the interview is covered. You can pick another part from the sessions screen, or revisit any question below.',
      isFollowUp: false, trackComplete: true,
    };
  }

  /** The question text for revisiting an already-covered area. */
  revisitQuestion(trackId: string, areaId: string): string {
    const area = trackById(trackId).areas.find((a) => a.id === areaId);
    if (!area) throw new Error(`Unknown area ${areaId} in ${trackId}`);
    return `Let us revisit something. ${area.question}`;
  }

  /**
   * Ingest an answer. If revisitAreaId is set, the answer re-answers a
   * covered area and is checked against the earlier answer for
   * contradiction. Otherwise it answers whatever nextQuestion() is showing.
   */
  ingestAnswer(
    memory: ProjectInterviewMemory,
    model: KnowledgeModel,
    sessionId: string,
    trackId: string,
    answer: string,
    revisitAreaId?: string,
  ): IngestResult {
    const now = new Date().toISOString();
    const nextMemory: ProjectInterviewMemory = JSON.parse(JSON.stringify(memory));
    const nextModel: KnowledgeModel = JSON.parse(JSON.stringify(model));
    let facts = 0, gaps = 0, risks = 0, contradictions = 0;

    let areaId: string;
    let effectiveTrackId = trackId;
    let question: string;
    let wasFollowUp = false;

    if (revisitAreaId) {
      areaId = revisitAreaId;
      question = this.revisitQuestion(trackId, revisitAreaId);
    } else {
      const q = this.nextQuestion(memory, trackId);
      if (q.areaId === 'done') {
        return {
          memory, model,
          qa: { trackId, areaId: 'done', question: q.question, answer: '', answeredAt: now },
          extracted: { facts: 0, gaps: 0, risks: 0, contradictions: 0 },
        };
      }
      areaId = q.areaId;
      effectiveTrackId = q.trackId; // may be another track's thread
      question = q.question;
      wasFollowUp = q.isFollowUp;
      if (wasFollowUp) {
        const idx = nextMemory.pendingThreads.findIndex(
          (f) => f.trackId === q.trackId && f.question === q.question,
        );
        if (idx >= 0) nextMemory.pendingThreads.splice(idx, 1);
      } else {
        const prog = nextMemory.trackProgress[effectiveTrackId] ?? { answeredAreas: [] };
        if (!prog.answeredAreas.includes(areaId)) prog.answeredAreas.push(areaId);
        nextMemory.trackProgress[effectiveTrackId] = prog;
      }
    }

    nextMemory.answerCount += 1;
    const track = trackById(effectiveTrackId);
    const detail = `Track ${track.n} (${areaId}), answer ${nextMemory.answerCount}`;
    const topic = `${effectiveTrackId}:${areaId}`;
    const trimmed = answer.trim();
    const qa: QA = { trackId: effectiveTrackId, areaId, question, answer: trimmed, answeredAt: now };

    if (trimmed.length > 0) {
      // Contradiction check BEFORE storing, against the earlier answer.
      if (revisitAreaId) {
        const prior = [...nextModel.entities.facts].reverse().find((f) => f.topic === topic);
        if (prior && normText(prior.statement) !== normText(trimmed)) {
          const gap: GapEntity = {
            id: newId('gap'), type: 'gap', confidence: 'high',
            sources: [{ kind: 'inferred', detail: `Differing answers to the same question (${detail})`, capturedAt: now }],
            createdAt: now, updatedAt: now, verified: false,
            question: `Earlier you said: "${prior.statement}" This time you said: "${trimmed}" Which is right, or are both true?`,
            raisedBecause: 'Answers to the same question differ between sessions',
            status: 'queued',
            relatedIds: [prior.id],
          };
          nextModel.entities.gaps.push(gap);
          gaps++; contradictions++;
          nextMemory.pendingThreads.push({
            trackId: effectiveTrackId, areaId,
            question: gap.question,
            reason: 'Two of your answers do not quite line up, and the record should carry the right one.',
          });
        }
      }

      const fact: FactEntity = {
        id: newId('fact'), type: 'fact', confidence: 'high',
        sources: [{ kind: 'interview', sessionId, detail, capturedAt: now }],
        createdAt: now, updatedAt: now, verified: false,
        statement: trimmed, topic,
      };
      nextModel.entities.facts.push(fact);
      facts++;

      for (const name of detectUndefinedNames(trimmed, nextMemory.knownNames)) {
        nextMemory.knownNames.push(name);
        nextModel.entities.gaps.push({
          id: newId('gap'), type: 'gap', confidence: 'high',
          sources: [{ kind: 'inferred', detail: `Name "${name}" mentioned without introduction (${detail})`, capturedAt: now }],
          createdAt: now, updatedAt: now, verified: false,
          question: `Who or what is "${name}"?`,
          raisedBecause: `Mentioned in the owner's answer without explanation`,
          status: 'queued',
          relatedIds: [fact.id],
        } satisfies GapEntity);
        gaps++;
        nextMemory.pendingThreads.push({
          trackId: effectiveTrackId, areaId,
          question: `You mentioned "${name}". Who or what is that, and what should the next person know?`,
          reason: `You brought up "${name}" and we want the next person to know who or what that is.`,
        });
      }

      for (const s of sentences(trimmed)) {
        if (ONLY_ME_PATTERNS.some((p) => p.test(s))) {
          nextModel.entities.risks.push({
            id: newId('risk'), type: 'risk', confidence: 'medium',
            sources: [{ kind: 'inferred', detail: `Single-person pattern in owner's words (${detail})`, capturedAt: now }],
            createdAt: now, updatedAt: now, verified: false,
            description: `In the owner's words: "${s}"`,
            impact: 'Not yet captured',
            riskKind: 'single point of failure',
          } satisfies RiskEntity);
          risks++;
          nextMemory.pendingThreads.push({
            trackId: effectiveTrackId, areaId,
            question: 'You said only you handle part of that. What would it take for someone else to learn it, and who could?',
            reason: 'Something only one person can do is a risk worth a closer look.',
          });
          break;
        }
      }

      const wordCount = trimmed.split(/\s+/).length;
      if (wordCount < SHORT_ANSWER_WORDS && !wasFollowUp && !revisitAreaId) {
        nextMemory.pendingThreads.push({
          trackId: effectiveTrackId, areaId,
          question: 'Could you say a little more about that? Small details help - this is exactly what a successor will not know.',
          reason: 'A brief answer often has more underneath it.',
        });
      }
    }

    nextModel.updatedAt = now;
    return { memory: nextMemory, model: nextModel, qa, extracted: { facts, gaps, risks, contradictions } };
  }
}
