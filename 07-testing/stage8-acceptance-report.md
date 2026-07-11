# STAGE 8 - ACCEPTANCE RUN REPORT (closes the build)

Date: 2026-07-10. Fixture business throughout.

## The single uninterrupted run (07-testing/acceptance.test.ts, automated)

One script, no manual intervention, through the whole product:
1. New project created and saved (Hartwell fixture)
2. Interview session 1, Track 1: five answers - name follow-up served,
   verbatim capture, single-person risk detected, session ended
3. Interview session 2, Tracks 7 & 8: cross-session memory intact,
   pending threads survived, sources attribute the correct sessions
4. Document ingested: 3 verbatim lines, 1 conflict surfaced
   (owner said March; document says September)
5. Conflict resolved through the resolution flow (document chosen;
   nothing deleted; zero open conflicts remain)
6. Dashboard reconciled exactly against a raw-JSON recount; one open
   question resolved from the dashboard
7. Nine deliverables generated: zero-invention audit clean on every one,
   disclaimer and version in every header, honest "Not yet captured."
   where the record is silent
8. Export: model round-trips byte-identically and validates against the
   frozen v1.0.0 contract; whole-project export/import round-trips too

RESULT: PASS, in one breath, repeatable on every test run.

## Definition of Done - item by item

| Requirement | Status |
|---|---|
| Every workflow end to end, no manual intervention | PASS - the acceptance run above |
| Generated documents fit to hand to an owner or their attorney | PASS - fixture package in 07-testing/stage6-package/, disclaimer first, owner's words throughout, verification markers |
| No placeholder text, unfinished screens, or dead navigation | PASS - navigation audit in stage8-audits.md |
| All tests pass; acceptance script passes clean | PASS - 56/56, lint clean, build clean |
| Model exports losslessly, validates against frozen Stage 1 contract | PASS - byte-identical round-trip, schemaVersion 1.0.0 unchanged since Stage 1 |
| Nothing gives or appears to give financial/tax/legal advice | PASS - disclaimer on every screen and document; copy audit clean |

## Hardening completed this stage
- Keyboard-accessible file inputs (a11y fix)
- Top-level error boundary with calm recovery copy
- Empty-answer nudge in interviews
- Copy fix: "model" jargon removed from a user-facing button
- 08-docs completed: HELP.md and DISCLAIMER.md (canonical language)

## Known, logged limitations (not defects)
- Rule-based engine: facts are verbatim, structure (processes, decisions,
  relationships as entities) is not auto-decomposed - the deferred API
  adapter (HANDOFF.md) is the path to that
- Dashboard screenshots substituted per logged precedent (no browser here)

The build is complete pending final approval.
