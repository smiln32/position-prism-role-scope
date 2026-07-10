# HANDOFF - Continuing this build in Claude Code

Owner: Carla. Decision 2026-07-10: the build moves from the Claude chat
environment to Claude Code in VSCode from Stage 4 onward.

## One-time setup (Carla)

1. Unzip this package somewhere permanent, e.g. ~/projects/successor
2. In that folder: git init, then commit everything as
   "Stages 0-3 complete (built in Claude chat)"
3. Open the folder in VSCode and start Claude Code
4. First instruction to Claude Code:
   "Read 00-control/CLAUDE.md, STATE.md, DECISIONS.md, and MASTER-SPEC.md,
   verify the baseline, then begin Stage 4."

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
  no-key fallback. Add as Stage 4.5 or fold into Stage 6 - builder's choice,
  logged either way.

## Verifying the baseline (Claude Code, before any Stage 4 work)

cd app && npm install && npm run build && npm test
Expected: clean build, 27/27 tests passing. If anything fails, stop and
report - do not begin Stage 4 on a broken baseline.

## Where things stand

Stages 0-3 complete and evidenced. Next: Stage 4 (all eight tracks +
cross-session memory + contradiction detection). See STATE.md for the
full inventory and 07-testing/stage3-acceptance.md for the latest
acceptance evidence.

## Unchanged rules

Everything else in CLAUDE.md still governs: never fabricate, verbatim or
labeled inference only, no credentials, stage gates with evidence, no
build-ahead, update STATE.md every session, deliverables render only from
the model.
