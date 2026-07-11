# HANDOFF - Continuing this build in Claude Code

Owner: Carla. Originally written for a Stage 4 handoff; the full staged
build (Stages 0-8) was subsequently completed in the chat environment.
This file now governs any FUTURE work in Claude Code: the API adapter,
Role DNA schema sharing, cloud sync, or maintenance.

## One-time setup (Carla)

1. Unzip this package somewhere permanent, e.g. ~/projects/successor
2. In that folder: git init, then commit everything as
   "Stages 0-8 complete (built in Claude chat)"
3. Open the folder in VSCode and start Claude Code
4. First instruction to Claude Code:
   "Read 00-control/CLAUDE.md, STATE.md, DECISIONS.md, and MASTER-SPEC.md,
   verify the baseline, then propose the next piece of work as a logged
   decision before building."

## What changes in the Claude Code environment

- STATE PERSISTENCE: git history replaces zip handoffs. CLAUDE.md rule 17
  (zip delivery) is retired; commit at every stage gate instead, one commit
  per gate minimum, message = the gate name.
- BROWSER TESTING: a real browser is available. Stage gate evidence should
  include actual screenshots from `npm run dev` where the spec asks for them.
- API ADAPTER NOW IN SCOPE: the deferred Anthropic API interview adapter
  (DECISIONS.md 2026-07-10) is authorized once Carla supplies an API key.
  Recommended: claude-haiku-4-5, key entered by the user in-app and held in
  memory only (never written to the project file or localStorage - it is a
  credential, and this product never stores credentials). Build it behind
  the existing InterviewEngine interface; the rule-based engine remains the
  no-key fallback. Build it behind the existing
  InterviewEngine interface as a new logged decision.

## Verifying the baseline (Claude Code, before any Stage 4 work)

cd app && npm install && npm run build && npm test
Expected: clean build, 56/56 tests passing (including the end-to-end
acceptance run). If anything fails, stop and report - never build on a
broken baseline.

## Where things stand

Stages 0-8 complete and evidenced; the Definition of Done passed in a
single automated acceptance run that re-proves itself on every test run.
See STATE.md for the full inventory and 07-testing/ for every stage's
evidence. The natural next pieces of work: the Haiku interview adapter
(structured extraction into processes, decisions, relationships), browser
screenshot evidence for the dashboard, and Role DNA schema sharing.

## Unchanged rules

Everything else in CLAUDE.md still governs: never fabricate, verbatim or
labeled inference only, no credentials, stage gates with evidence, no
build-ahead, update STATE.md every session, deliverables render only from
the model.
