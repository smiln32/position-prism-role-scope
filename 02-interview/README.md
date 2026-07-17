# Interview Engine - Stage 4 (all eight tracks)

## Architecture

The engine sits behind the InterviewEngine interface
(app/src/interview/engine.ts). The shipped implementation is
RuleBasedEngine: deterministic, free, offline, fully testable.
An LLM-backed adapter (Anthropic API, Haiku-class, user-supplied key)
may be added later behind the same interface - deferred per
DECISIONS.md 2026-07-10.

## The eight tracks (owner) and seven role tracks

Since 2026-07-17 (DECISIONS.md): a model whose subjectRole is a role title
("Bookkeeper") uses ROLE_TRACKS - 7 tracks / 44 areas addressed to the
person who does the job, interviewed role-holder-first; the owner is the
fallback source and the verifier. trackSetFor(subjectRole) selects the set.
The original eight below apply when subjectRole is "owner".

All question text lives in TRACKS in engine.ts (single source of truth):
1. The Business As It Really Runs (8 areas)
2. Customers & Revenue Truths (6)
3. Vendors, Partners & the Outside World (6)
4. People & the Inside World (6)
5. Decisions & Judgment (6)
6. History & Scar Tissue (6)
7. Risks & Fragilities (6)
8. The Handoff (6)
Tracks can be taken in any order; a session picks one track per sitting.

## Adaptive behavior (rule-based)

1. Verbatim capture: every non-empty answer becomes one Fact whose
   statement is the owner's words, unmodified. Source: interview +
   session id + "Track 1 (area), answer N". The engine never paraphrases,
   summarizes, or invents.
2. Undefined names: capitalized words mid-sentence, not stoplisted, not
   already known, trigger a Gap entity (status queued) and a follow-up
   question. Sentence-initial capitals are skipped on purpose -
   conservative beats wrong.
3. Single-person patterns ("only I", "nobody else", "just me") trigger a
   Risk entity quoting the owner's exact sentence (source: inferred,
   labeled with the trigger) plus a follow-up about who could learn it.
4. Brief answers (under 12 words) get one gentle probe. No entity is
   created - brevity is not knowledge.
5. Follow-ups queue FIFO and are asked before new areas. Coverage readout
   = areas answered / areas in the selected track (8 for Track 1, 6 for the
   rest; 50 across all eight). The interview reports complete only when
   every track's areas are covered and the queue is empty.
6. Track 7 ("Risks & Fragilities") answers additionally become
   owner-declared RiskEntities - verbatim, source 'interview', high
   confidence, unverified - because those six questions ask about risk in
   so many words (TrackArea.riskKind; DECISIONS.md 2026-07-16, P5).
   A leading dismissal ("nothing really...") stays a fact only. Before
   this, no Track 7 answer ever reached the Knowledge Risk Report.

## Cross-session memory (Stage 4)

ProjectInterviewMemory lives on the project file: per-track coverage,
the pending-thread queue, known names, and a global answer counter.
Unresolved threads survive the end of a session and are asked FIRST in
any later session; threads from other tracks surface once the selected
track is covered, labeled with their origin. Per-session transcripts live
on SessionMeta.transcript. Legacy Stage 3 per-session state migrates
automatically on load.

## Contradiction detection (Stage 4)

Any covered area can be revisited. If the new answer differs from the
stored answer for that track+area (normalized compare), the engine creates
a contradiction Gap quoting BOTH answers verbatim, links it to the prior
fact, keeps both facts (nothing overwritten), and queues a "which is
right?" thread for a later session. Identical re-answers do not flag.

## Acceptance

07-testing/stage3-acceptance.md - Track 1 transcript + model diff with
zero-fabrication audit. 07-testing/stage4-acceptance.md - multi-session
evidence: thread persistence, worked contradiction, all tracks reachable.
Automated: engine.test.ts + stage4.test.ts in the app's test suite (the
suite grows; STATE.md carries the current count).
