# Interview Engine - Stage 4 (all eight tracks)

## Architecture

The engine sits behind the InterviewEngine interface
(app/src/interview/engine.ts). Its methods return `T | Promise<T>` so a
synchronous and an asynchronous engine share one contract. The default
implementation is RuleBasedEngine: deterministic, free, offline, fully
testable - and the no-key fallback.

An optional Anthropic-backed adapter (LlmInterviewEngine in
app/src/interview/llm.ts, claude-haiku-4-5, user-supplied key) implements
the same interface. It never controls the model's structure or coverage:
the rule-based engine still writes the owner's answer verbatim as the
high-confidence Fact and still does the deterministic gap/risk detection
(the "floor"). On top of that floor the model only (a) rewords the next
question warmly without changing which area is asked, and (b) proposes
structured processes/decisions/relationships - each stored source
'inferred', confidence 'low', verified=false, so every deliverable marks
it "(needs verification) (low confidence)" and it can never pass as the
owner's own words. Any failure or missing key returns the untouched floor.
The API key is held in memory only and is never written anywhere (rule 11).
Tests: app/src/interview/llm.test.ts. Logged in DECISIONS.md 2026-07-10
("LLM interview adapter"). The live network path needs a real key + a
browser to exercise end-to-end.

## The eight tracks

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
   = areas answered / 8. The session reports complete only when all areas
   are covered and the queue is empty.

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
Automated: engine.test.ts (5) + stage4.test.ts (6) inside the 33-test suite.
