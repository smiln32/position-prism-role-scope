# STATE.md - Project State

Last updated: 2026-07-16
Current stage: Stage 8 (Hardening & Acceptance) - COMPLETE. BUILD COMPLETE.
Expansion ongoing: PRs #4/#5/#6 merged 2026-07-13; PRs #7/#9/#10 merged
2026-07-15 (perf code-split, scroll-to-top UX fix, README + .env gitignore).
The LLM adapter (#3) remains the only open feature branch (draft); the prior
handoff PR #8 is stale (see HANDOFF-2026-07-15.md).

2026-07-16 (docs/workspace session, uncommitted at time of writing):
- CLAUDE.md now lives at the REPO ROOT and nowhere else (owner directive).
  MASTER-SPEC.md's workspace table amended to match; logged in DECISIONS.md.
- New root CONTEXT.md - task routing / stage map, pairing each numbered folder
  with its app/src source. Read it after CLAUDE.md.
- 06-export/ documented at last (README.md); it was the only empty workspace
  folder since Stage 0. Documentation gap, never a missing feature.
- New root ICM-AUDIT-LOG.md - conformance audit vs the Interpretable Context
  Methodology: 9/24. Conversion to a stages/ tree DECLINED pending an owner
  decision on which ICM is the target (see DECISIONS.md 2026-07-16).
- Owner's untracked root docs: the duplicate "Business Knowledge Succession
  Platform.txt" and "Succession-description.txt" were deleted at owner request;
  the .md (superset) remains.
- Docs only. No app/ source touched. 106 tests still pass, 14 files.

2026-07-16 (defect-fix session, branch fix/provenance-and-extraction-defects):
Three defects found by reading the source end to end against the owner's
decision to run Successor as a SERVICE (he interviews, he delivers reports, the
company keeps its data). Test suite 106 -> 124. Frozen schema untouched.
- P1 PROVENANCE (the important one): capture.ts claimed "Entered directly by the
  owner" + verified=true for everything it created. In a service engagement the
  OPERATOR types the structure, so that was a false attribution in the field the
  product rests on. capture.ts now takes an Attribution ({enteredBy}), defaulting
  to OWNER so nothing existing changed; 'operator' entries are 'inferred' /
  medium / UNVERIFIED and name who structured them and from which fact.
  KnowledgeScreen has a "Who is entering this?" control. This makes the existing
  setVerified() promotion path meaningful for the first time.
- P3 THE MAY BUG: the First Year calendar filed every "we may need to..." under
  May (case-insensitive substring on month names). Now word-boundary, and
  case-sensitive for March/May/August.
- P4 NAME-GAP NOISE: a 4-line vendor list raised 11 gaps ("Who or what is
  Machine?"). Now: business/owner names are known, consecutive capitals group
  into one name, ALL-CAPS labels are ignored, and gaps are capped at 25/document
  with the overflow reported. Same fixture: 11 -> 3 gaps.
Same session, second pass ("clean the rest up", owner-delegated judgment).
Suite 124 -> 131. Frozen schema and scoring formula untouched.
- P5: Track 7 answers now become owner-declared RiskEntities (verbatim, source
  'interview', high, unverified; riskKind per area; dismissals excluded).
  Before: the risk track produced zero risks and every risk scored 95.
- P6: handbook renders document lines grouped per document as bullets, not one
  blockquote per line. Capture and AI export unchanged.
- P7: renderers distinguish NOT_ASKED ("This part of the interview has not
  been asked yet.") from NOT_CAPTURED via interviewMemory. Engine completion
  semantics deliberately untouched (that's the engagement-type knob, deferred
  with P2-A pending the pilot).
- P2: resolved for the pilot by P1's operator attribution (post-hoc
  structuring, honestly attributed). In-interview structured capture (P2-A)
  and the LLM adapter (P2-B) deferred pending pilot evidence, per the accepted
  recommendation.
- Living-doc staleness fixed: README's phantom "existing" AI adapter (draft
  PR #3, not on master - now says so), coverage "/8", embedded test counts
  (replaced with pointers, not fresh numbers), HELP.md's missing passphrase +
  file-type notes, build-review.md's unmarked stale "VERIFIED" claims (dated
  banner added).
Same session, third pass: PRs #3 and #8 CLOSED on GitHub (owner-directed
archive; both branches retained on origin - #3 is deferred-not-rejected, see
DECISIONS.md 2026-07-16 for the port-don't-merge revival note).
Still open, needs the owner: the org rollup (multi-model renderer - new
feature), P2-A/engagement types, real PDF export, pushing the branches.

2026-07-17 (feature/role-interviews branch): the owner-approved pre-pilot
batch, five commits, suite 131 -> 154. All logged in DECISIONS.md 2026-07-17.
- ROLE INTERVIEWS: role-holder-first principle; ROLE_TRACKS (7 tracks / 44
  areas); trackSetFor(subjectRole); NewProjectScreen subject choice. No
  schema change - subjectRole carries the role title, names are attribution.
- DELETION CAUTION + CUSTODY: the app's first-ever delete (remove() was
  wired to nothing), gated behind identify/warn/export/attest;
  08-docs/CUSTODY.md holds the per-engagement protocol.
- REAL PDF EXPORT: pdfmake 0.3 (first runtime dependency, logged), lazy
  chunks only, standard-14 Times fonts, pure markdown converter, real-bytes
  test. Role projects render job-focused deliverables (The Role Handbook,
  The First Year in the Role); owner output byte-identical.
- OPERATOR POLISH: ProjectFile.operatorName (additive) persists the name
  between sittings; TranscriptSourcePicker workbench threads the chosen
  verbatim answer into each structured entry's SourceRef.
Next milestone: the pilot. Owner's parallel items: exit-planner
conversation, engagement letter (custody + keep-nothing terms).
Next stage: none in the staged build. The path from prototype to shippable
product is now tracked in PATH-TO-SHIP.md (three owner decisions + Tiers 1-4).
Future work proceeds via HANDOFF-2026-07-15.md and new logged decisions.

## What exists right now

- Everything from Stages 0-1 (see approval log)
- app/src/project/store.ts - project file format v1 { formatVersion, model,
  sessions[] }; ProjectStore over an injectable StorageLike (localStorage in
  the app, in-memory fake in tests); save/load/list/remove/export/import;
  session helpers startSession/resumeSession/endSession
- app/src/project/store.test.ts - Stage 2 acceptance walkthrough: create ->
  destroy all in-memory state -> resume from storage -> byte-identical
  export; plus import/export round-trip and invalid-input refusal (4 tests)
- app/src/App.tsx - three real screens: Home (project list, restore from
  file, developer inspector link), New Project (profile with "why we ask"
  copy), Project (profile summary, session create/resume/end, export)
- app/src/index.css - visual system v1; documented in 08-docs/VISUAL-SYSTEM.md
- app/src/interview/engine.ts - InterviewEngine interface + RuleBasedEngine
  (Track 1, 8 areas): verbatim fact capture, name-gap detection with
  follow-ups, single-person risk detection quoting the owner, short-answer
  probes, FIFO follow-up queue, coverage readout, completion detection
- app/src/interview/InterviewScreen.tsx - interview UI wired into sessions;
  InterviewState persists on SessionMeta.interview (optional additive field)
- 02-interview/README.md - track definition + adaptive behavior doc
- 07-testing/stage3-acceptance.md - transcript + model diff evidence with
  zero-fabrication audit, generated by the real engine
- STAGE 4: engine generalized to all 8 tracks (50 areas total - corrected
  2026-07-16, counted from TRACKS in engine.ts; this line said 44 and
  contradicted the "50 areas" in the Stage 7 entry below, questions in
  TRACKS in engine.ts); ProjectInterviewMemory on the project file carries
  coverage, pending threads, known names across sessions; threads asked
  first in later sessions, cross-track threads surface labeled; revisit
  flow with contradiction detection (both answers quoted verbatim, prior
  fact linked, "which is right?" thread queued); legacy Stage 3 session
  state auto-migrates on load; InterviewScreen adds track picker + revisit
- 07-testing/stage4-acceptance.md - multi-session + worked contradiction
- STAGE 5: app/src/analysis/extract.ts - line-verbatim document extraction
  with attribution, conservative name gaps, deterministic conflict rule
  (3+ shared content words + differing months/numbers), owner-directed
  resolution (verify chosen, demote other, resolve gap, delete nothing);
  DocumentsScreen with paste/upload, conflict cards, resolution buttons;
  ProjectFile.documents additive field; 03-analysis/README.md
- 07-testing/stage5-acceptance.md - before/after diff, conflict resolved
- STAGE 6: app/src/deliverables/render.ts - nine renderers over the model
  with Doc.c() audit registration; auditRendered() proves zero invention;
  "Not yet captured" for empty sections; needs-verification/low-confidence
  markers; per-deliverable versioning on the project file; DeliverablesScreen
  with read view, per-doc + package markdown download, model JSON download,
  print view; 05-deliverables/README.md; generated fixture package with
  audit summary in 07-testing/stage6-package/
- STAGE 7: app/src/dashboard/metrics.ts - published risk-scoring formula
  with per-risk reasons; computeMetrics (completeness of 50 areas, risk
  bands, gap statuses, verification, freshness with 90-day stale flag);
  resolveGap owner-directed; DashboardScreen "Where things stand"; Risk
  Report deliverable now prints scores + reasons; 04-model-views/README.md
- 07-testing/stage7-acceptance.md - exact reconciliation table + export
  validation evidence
- STAGE 8: ErrorBoundary, keyboard-accessible file inputs, empty-answer
  nudge, copy polish, 08-docs/HELP.md + DISCLAIMER.md; audits in
  07-testing/stage8-audits.md; acceptance run report in
  07-testing/stage8-acceptance-report.md
- Test suite: 106 tests passing on master (+1 end-to-end acceptance run)
- MERGED to master 2026-07-13 (PRs #5, #6, #4; see DECISIONS.md 2026-07-13):
  * #5 feature/list-field-editing - array fields (a process's steps, a
    decision's criteria, …) editable item-by-item via addListItem/editListItem/
    removeListItem/listFieldValues in capture.ts + an inline list editor in
    KnowledgeScreen.tsx. Steps renumber 1..n; removal is owner-directed item
    correction (the only removal, never a silent drop).
  * #6 feature/storage-durability - collision-proof newId (full 122-bit UUID)
    and a one-deep backup slot in store.ts (BACKUP_PREFIX): save backs up the
    current *valid* primary; load recovers from backup on a missing/corrupt
    primary; quota failure -> clear error, prior primary intact; remove clears
    the backup. mergeModels() intentionally still NOT wired (deferred to a real
    sync path).
  * #4 feature/data-at-rest-encryption - passphrase protection behind the
    StorageLike seam. crypto.ts (WebCrypto PBKDF2(250k)/AES-GCM, no new deps),
    vault.ts (EncryptedStorage; in-memory decrypted working copy, serialized
    encrypt-through; enable/unlock/disable/flush/exportSealed), App.tsx unlock
    gate + "Protect this computer" panel, 08-docs/SECURITY.md. Passphrase is
    memory-only (rule 4).
  * Reconciliation on merge: the vault now also encrypts #6's backup keys
    (isManagedKey = project OR backup prefix), so backups are sealed at rest
    and recoverable. Frozen schema untouched throughout.
- MERGED to master (PR #7, perf/code-split-screens): route-level code
  splitting. The six navigation-only screens are React.lazy() behind one
  Suspense boundary in App.tsx; initial JS 87.2KB -> 69.0KB gzip (~21%), demo
  fixture out of the production initial bundle. No behavior change; 106 tests
  pass. See DECISIONS.md 2026-07-13 (perf/code-split-screens).
- UX fix (branch fix/scroll-to-top-on-navigation): every view change now opens
  at the top (window.scrollTo(0,0) keyed on the view identifier) in App.tsx,
  DeliverablesScreen, and InterviewScreen; in-place edits (answering a question,
  the Knowledge "+ Add" form) intentionally left where they are. Behavior-only;
  106 tests pass. See DECISIONS.md 2026-07-14.
- MERGED to master (PR #1, maintenance/merge-report-timestamp-fix): merge.ts
  excludes 'updatedAt' from the content-change loop so a pure timestamp bump
  reports 'unchanged' not 'updated'; +1 regression test. Report-labeling only;
  merge semantics and frozen schema untouched. See DECISIONS.md 2026-07-10
  Maintenance entry.
- MERGED to master (PR #2, feature/structured-knowledge-capture): three
  post-review improvements. Clean build + lint.
  * app/src/knowledge-model/capture.ts - pure, tested add/edit functions for
    the entity types the interview never creates (relationships, decisions,
    processes, judgments, history, systems, commitments) + patchEntity +
    setVerified. Owner-entered = source 'interview'/"entered directly",
    confidence high, verified true. Closes the gap where the Relationship Map,
    Decision Playbook, and Memory Archive rendered mostly "Not yet captured".
  * app/src/knowledge-model/KnowledgeScreen.tsx - "Everything on record":
    browse + add + inline-edit + confirm, wired as the 'knowledge' screen with
    a "Review & add knowledge" button on the project screen.
  * Component-test harness: jsdom + @testing-library/react/dom (dev deps),
    per-file `@vitest-environment jsdom`. KnowledgeScreen.test.tsx (5) and
    App.test.tsx (2, first coverage of App.tsx). Genuinely browser-verified
    via real DOM render + events. See DECISIONS.md 2026-07-10 "Post-review
    improvements".

## How to resume a session (Claude Code, from Stage 4 on)

1. Read CLAUDE.md and CONTEXT.md (repo root), then 00-control/HANDOFF.md,
   STATE.md, DECISIONS.md, MASTER-SPEC.md.
3. cd app && npm install && npm run build && npm test - all must pass clean.
4. Proceed with the stage listed as "Next stage" above.

## Open items

- Anthropic API interview adapter: DEFERRED (see DECISIONS.md 2026-07-10).
- Screenshots of Stage 2 screens: environment has no browser; Carla can
  take them from the delivered zip if wanted (evidence substitution logged).

## Stage approval log

- Stage 0: approved 2026-07-10 ("Work on the next stage").
- Stage 1: approved 2026-07-10 ("You pick, be conservative on stage 2").
- Spec amendment 2026-07-10: builder proceeds automatically between stages.
- Stage 2: complete 2026-07-10 under the amendment; gate report delivered
  with the Stage 2/3 zip for after-the-fact audit.

2026-07-17 (feature/assisted-interviewing branch): archived PR #3 revived by
PORT (never merged): AssistedExtraction enrichment layer in llm.ts - floor
saved before any network call, drafts across all 7 non-interview entity types
(inferred/low/unverified), clarification flags (max 3/answer) queued as
follow-up threads, memory-only key with home-screen panel, guarded live test
(llm.live.test.ts - owner runs with his key). Question rewording dropped
deliberately (operator reads questions aloud). Suite 154 -> 166 + 1 guarded
live. Remaining: the owner's live run, then merge.

2026-07-17 session close: HANDOFF-2026-07-17.md is the live snapshot.
Assisted interviewing built (llm.ts, 166 tests + guarded live test);
awaiting the owner's live key run, then merge. Role Package reports
(Job Description / SOPs / Training Guide / Commitment Register) proposed,
awaiting owner go. PR #13 open; assisted-interviewing branch stacked on it.
