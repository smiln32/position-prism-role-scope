# Deliverable Generation - Stage 6

Source: app/src/deliverables/render.ts + DeliverablesScreen.tsx
Generated fixture package: 07-testing/stage6-package/

## The nine documents
1. Executive Knowledge Summary - counts, per-track coverage, what remains at risk
2. The Successor's Handbook - every captured statement in the owner's words,
   organized by track and question, plus non-track knowledge and document lines
3. Relationship Transfer Map - who, why, history, expectations, transfer risk/plan
4. Decision Playbook - decision types, criteria, thresholds, worked examples,
   judgment calls, owner's words on deciding
5. First Year Without the Founder - annual rhythm, month-by-month calendar of
   every month-bearing statement, change-slowly and never-change guidance
6. Institutional Memory Archive - history, scar tissue, commitments/handshakes
7. Continuity & Emergency Brief - what breaks first, single points of failure,
   who to call, relationships, systems and where access lives (never credentials)
8. Knowledge Risk Report - full risk record + open questions, with the
   published Stage 7 scoring formula (04-model-views/README.md)
9. AI-Ready Knowledge Export - the lossless model JSON

## Integrity mechanism
Renderers register every model-derived string through Doc.c(); the automated
audit (auditRendered) verifies each against the model's field values. The
audit runs in the test suite on every build - "audited line-by-line" is a
standing test, not a one-time check. Empty sections say "Not yet captured."
Unverified items carry "(needs verification)"; low confidence compounds.

## Versioning & export
Per-deliverable version counters on the project file, bumped each generation,
printed in every header with the generation date. Downloads: per-document
markdown, whole-package markdown, model JSON. Print view uses the app's
serif system via the browser (print CSS hides controls).

## The disclaimer
Every document header carries: operating knowledge only, not financial/tax/
legal/estate advice, see your CPA, attorney, and exit planner.
