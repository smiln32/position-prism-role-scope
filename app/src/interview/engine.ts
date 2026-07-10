import type { KnowledgeModel, FactEntity, GapEntity, RiskEntity } from '../knowledge-model/schema';
import { newId } from '../knowledge-model/model';

/**
 * Interview engine - Stage 3, Track 1 only.
 *
 * Architecture ruling (DECISIONS.md 2026-07-10): the engine sits behind
 * this interface. The shipped implementation is deterministic and
 * rule-based: free, offline, testable. An LLM-backed adapter may be added
 * later behind the same interface via a logged decision.
 *
 * Knowledge integrity: the rule-based engine NEVER paraphrases. Every
 * captured Fact is the owner's answer verbatim. Risks and Gaps are marked
 * source kind 'inferred' with the exact trigger recorded, and Risks quote
 * the owner's own sentence.
 */

export interface QA {
  areaId: string;
  question: string;
  answer: string;
  answeredAt: string;
}

export interface FollowUp {
  areaId: string;
  question: string;
  reason: string;
}

export interface InterviewState {
  trackId: 'track-1';
  answeredAreas: string[];
  followUpQueue: FollowUp[];
  answerCount: number;
  transcript: QA[];
  /** Names the owner has already been asked about or defined. */
  knownNames: string[];
  complete: boolean;
}

export interface IngestResult {
  state: InterviewState;
  model: KnowledgeModel;
  extracted: { facts: number; gaps: number; risks: number };
}

export interface NextQuestion {
  areaId: string;
  question: string;
  isFollowUp: boolean;
  reason?: string;
  coverage: { covered: number; total: number };
  complete: boolean;
}

export interface InterviewEngine {
  createState(): InterviewState;
  nextQuestion(state: InterviewState): NextQuestion;
  ingestAnswer(
    state: InterviewState,
    model: KnowledgeModel,
    sessionId: string,
    answer: string,
  ): IngestResult;
}

/** Track 1 - The Business As It Really Runs. Eight coverage areas. */
export const TRACK_1 = {
  id: 'track-1' as const,
  title: 'The Business As It Really Runs',
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
};

const SHORT_ANSWER_WORDS = 12;

/** Words that look like names but are not. Conservative on purpose. */
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

/** Split into sentences well enough for quoting triggers. */
function sentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
}

/** Capitalized tokens that are not sentence-initial and not stoplisted. */
export function detectUndefinedNames(answer: string, known: string[]): string[] {
  const knownLower = new Set(known.map((k) => k.toLowerCase()));
  const found: string[] = [];
  for (const s of sentences(answer)) {
    const tokens = s.split(/\s+/);
    tokens.forEach((raw, idx) => {
      const word = raw.replace(/[^A-Za-z']/g, '');
      if (idx === 0) return; // sentence-initial capitals are ambiguous - skip
      if (!/^[A-Z][a-zA-Z']+$/.test(word)) return;
      if (NAME_STOPLIST.has(word.replace(/'/g, ''))) return;
      if (knownLower.has(word.toLowerCase())) return;
      if (found.some((f) => f.toLowerCase() === word.toLowerCase())) return;
      found.push(word);
    });
  }
  return found;
}

export class RuleBasedEngine implements InterviewEngine {
  createState(): InterviewState {
    return {
      trackId: 'track-1',
      answeredAreas: [],
      followUpQueue: [],
      answerCount: 0,
      transcript: [],
      knownNames: [],
      complete: false,
    };
  }

  nextQuestion(state: InterviewState): NextQuestion {
    const coverage = { covered: state.answeredAreas.length, total: TRACK_1.areas.length };
    const fu = state.followUpQueue[0];
    if (fu) {
      return { areaId: fu.areaId, question: fu.question, isFollowUp: true, reason: fu.reason, coverage, complete: false };
    }
    const next = TRACK_1.areas.find((a) => !state.answeredAreas.includes(a.id));
    if (next) {
      return { areaId: next.id, question: next.question, isFollowUp: false, coverage, complete: false };
    }
    return {
      areaId: 'done',
      question: 'That covers everything in this part of the interview. Thank you - this is exactly the knowledge a successor will need.',
      isFollowUp: false,
      coverage,
      complete: true,
    };
  }

  ingestAnswer(
    state: InterviewState,
    model: KnowledgeModel,
    sessionId: string,
    answer: string,
  ): IngestResult {
    const asked = this.nextQuestion(state);
    if (asked.complete) {
      return { state, model, extracted: { facts: 0, gaps: 0, risks: 0 } };
    }
    const now = new Date().toISOString();
    const nextState: InterviewState = JSON.parse(JSON.stringify(state));
    const nextModel: KnowledgeModel = JSON.parse(JSON.stringify(model));
    const answerNo = state.answerCount + 1;
    const detail = `Track 1 (${asked.areaId}), answer ${answerNo}`;
    const src = [{ kind: 'interview' as const, sessionId, detail, capturedAt: now }];

    // Consume the question that was just answered.
    if (asked.isFollowUp) nextState.followUpQueue.shift();
    else if (!nextState.answeredAreas.includes(asked.areaId)) nextState.answeredAreas.push(asked.areaId);
    nextState.answerCount = answerNo;
    nextState.transcript.push({ areaId: asked.areaId, question: asked.question, answer, answeredAt: now });

    const trimmed = answer.trim();
    let facts = 0, gaps = 0, risks = 0;

    if (trimmed.length > 0) {
      // 1. The answer itself, verbatim - never paraphrased.
      const fact: FactEntity = {
        id: newId('fact'), type: 'fact', confidence: 'high', sources: src,
        createdAt: now, updatedAt: now, verified: false,
        statement: trimmed,
        topic: `Track 1: ${asked.areaId}`,
      };
      nextModel.entities.facts.push(fact);
      facts++;

      // 2. Undefined names -> Gap entities + follow-up questions.
      for (const name of detectUndefinedNames(trimmed, nextState.knownNames)) {
        nextState.knownNames.push(name);
        const gap: GapEntity = {
          id: newId('gap'), type: 'gap', confidence: 'high',
          sources: [{ kind: 'inferred', detail: `Name "${name}" mentioned without introduction (${detail})`, capturedAt: now }],
          createdAt: now, updatedAt: now, verified: false,
          question: `Who or what is "${name}"?`,
          raisedBecause: `Mentioned in the owner's answer without explanation`,
          status: 'queued',
          relatedIds: [fact.id],
        };
        nextModel.entities.gaps.push(gap);
        gaps++;
        nextState.followUpQueue.push({
          areaId: asked.areaId,
          question: `You mentioned "${name}". Who or what is that, and what should the next person know?`,
          reason: `You brought up "${name}" and we want the next person to know who or what that is.`,
        });
      }

      // 3. "Only I / nobody else" -> Risk quoting the owner's sentence.
      for (const s of sentences(trimmed)) {
        if (ONLY_ME_PATTERNS.some((p) => p.test(s))) {
          const risk: RiskEntity = {
            id: newId('risk'), type: 'risk', confidence: 'medium',
            sources: [{ kind: 'inferred', detail: `Single-person pattern in owner's words (${detail})`, capturedAt: now }],
            createdAt: now, updatedAt: now, verified: false,
            description: `In the owner's words: "${s}"`,
            impact: 'Not yet captured',
            riskKind: 'single point of failure',
          };
          nextModel.entities.risks.push(risk);
          risks++;
          nextState.followUpQueue.push({
            areaId: asked.areaId,
            question: 'You said only you handle part of that. What would it take for someone else to learn it, and who could?',
            reason: 'Something only one person can do is a risk worth a closer look.',
          });
          break; // one risk follow-up per answer is enough
        }
      }

      // 4. Very short answers -> one gentle probe (no entity - nothing was withheld, just brief).
      const wordCount = trimmed.split(/\s+/).length;
      if (wordCount < SHORT_ANSWER_WORDS && !asked.isFollowUp) {
        nextState.followUpQueue.push({
          areaId: asked.areaId,
          question: 'Could you say a little more about that? Small details help - this is exactly what a successor will not know.',
          reason: 'A brief answer often has more underneath it.',
        });
      }
    }

    nextModel.updatedAt = now;
    nextState.complete = this.nextQuestion(nextState).complete;
    return { state: nextState, model: nextModel, extracted: { facts, gaps, risks } };
  }
}
