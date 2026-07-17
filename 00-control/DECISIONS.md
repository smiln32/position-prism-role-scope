# DECISIONS.md - Decision Log

Format: date | stage | decision | rationale | status

---

2026-07-10 | Stage 0 | The app lives in app/ at the repo root, alongside
the numbered workspace folders, rather than inside a numbered folder.
Rationale: the numbered folders hold design artifacts, contracts, prompts,
tests, and docs per the spec's workspace table; the runnable application is
a distinct thing and keeping it separate avoids ambiguity about what
belongs where. | Approved by build convention; flag at gate if objected to.

2026-07-10 | Stage 0 | Stage 0 shell content is limited to: product name,
one-sentence purpose, the not-financial/legal/tax disclaimer, and a build-
status line. Rationale: spec requires "no placeholder anything" and also an
"empty app shell." Real, minimal copy satisfies both; no fake navigation or
stub screens were added. | Done.

2026-07-10 | Stage 0 | The disclaimer appears on the shell starting at
Stage 0, ahead of its formal Stage 6 deliverable requirement. Rationale:
this is copy, not a feature; the spec's product boundary ("must state this
plainly") applies to every screen shipped. Not considered build-ahead. |
Done.

2026-07-10 | Stage 0 | Deferred (noted, not built): the visual system
(typography, palette, tone) is a Stage 2 deliverable. The shell uses a
plain serif placeholder-neutral style that will be replaced by the Stage 2
visual system. | Deferred to Stage 2.

2026-07-10 | Stage 0 | Environment: stateless container. Project delivered
as a zip at every gate; sessions resume by restoring the latest zip.
Recorded as an operating rule in CLAUDE.md item 17. | Done.

2026-07-10 | Gate | Stage 0 approved by Carla ("Work on the next stage").
Stage 1 authorized. | Logged.

2026-07-10 | Stage 1 | Schema implementation lives in app/src/knowledge-model/
as a self-contained module with zero app dependencies (extractable later as
the shared Role DNA package). 01-schema/ holds the human-readable contract
(README.md) and the JSON fixtures, per the spec's workspace table.
Rationale: the app must import the schema; workspace folders hold artifacts,
not compiled source. | Done.

2026-07-10 | Stage 1 | Fixture model uses a clearly fictional business
("Hartwell Machine & Tool, fixture data - not a real company") so tests and
later stage demos never mix fiction with captured knowledge. Rule 6
(never fabricate) applies to captured user knowledge, not labeled test
fixtures, which the spec itself requires. | Done.

2026-07-10 | Stage 1 | Merge semantics: merge never deletes; on id collision
the newer updatedAt wins field-by-field only where incoming fields are
non-empty, sources are unioned, and every change is returned in a MergeReport
(rule 9: no silent modification). Dedupe detects candidates by normalized
natural keys per entity type and reports them - it never auto-merges
distinct ids. | Done.

2026-07-10 | Gate | Stage 1 approved by Carla ("You pick, be conservative on
stage 2"). Stage 2 authorized with builder-chosen conservative design. | Logged.

2026-07-10 | Spec amendment (approved by Carla, "Is there any reason you need
my input" exchange) | Builder proceeds stage to stage automatically, stopping
only when a decision genuinely requires the owner. Gate reports still written
at every stage with full evidence for after-the-fact audit. | Approved.

2026-07-10 | Stage 3 ruling (Carla: "are there free options or low cost
ones?") | Interview engine built behind an InterviewEngine interface.
Default implementation: deterministic rule-based engine (free, offline,
testable). Optional Anthropic API adapter (Haiku 4.5, ~$0.05-0.10 per
session, user-supplied key) is DEFERRED - cannot be tested in this build
environment without a key, and untested code violates spec rule 6.
May be added later via a logged decision. | Approved.

2026-07-10 | Stage 2 | Project file format v1: { formatVersion, model,
sessions[] }. Wraps the frozen v1.0.0 KnowledgeModel without modifying it;
sessions are app-level records (id, label, startedAt, lastResumedAt,
status), not knowledge. | Done.

2026-07-10 | Stage 2 | Visual system (conservative): Georgia/serif type at
17px base, white paper, near-black ink #2b2b2b, single restrained accent
deep slate #33556e (WCAG AA on white), generous spacing, plain language,
every screen carries a one-line "why we ask" explanation. Documented in
08-docs/VISUAL-SYSTEM.md. | Done.

2026-07-10 | Stage 2 | Gate evidence substitution: this environment has no
browser for screenshots/recordings. The create/close/resume walkthrough is
proven instead by an automated test that creates a project, destroys all
in-memory state, resumes from storage, and asserts byte-level losslessness.
Stronger than a recording; screenshots can be taken by Carla from the
delivered zip. | Logged.

2026-07-10 | Stage 3 | SessionMeta gains an optional additive field
`interview?: InterviewState`. Project format version stays 1.0.0 because
validation is structural-minimal and every existing 1.0.0 file remains
valid; nothing existing changes meaning. | Done.

2026-07-10 | Stage 3 | Rule-based extraction policy: Facts are the owner's
answers verbatim (never paraphrased); Gaps and Risks are the only inferred
entities, always labeled source kind 'inferred' with the exact trigger,
and Risks quote the owner's own sentence. Sentence-initial capitalized
words are excluded from name detection - conservative beats wrong. | Done.

2026-07-10 | Handoff | Carla chose Option A: the build moves to Claude Code
in VSCode from Stage 4 onward. Git history replaces zip handoffs (CLAUDE.md
rule 17 retired in that environment); browser screenshots become available
for gate evidence; the deferred Anthropic API interview adapter is
authorized once Carla supplies a key (claude-haiku-4-5 recommended, key
held in memory only, never stored - this product never stores credentials).
Rule-based engine remains the no-key fallback. See 00-control/HANDOFF.md. |
Approved.

2026-07-10 | Handoff amendment | Carla directed Stage 4 to be built here in
the chat environment ("Start on stage four next"), superseding the immediate
Claude Code move. HANDOFF.md remains valid for whenever the move happens;
zip delivery resumes for this stage. | Approved.

2026-07-10 | Stage 4 | Interview memory moves from per-session to
project level (ProjectInterviewMemory: trackProgress, pendingThreads,
knownNames, answerCount) so unresolved threads persist and are revisited
across sessions. SessionMeta keeps a per-session transcript and gains
trackId. Legacy Stage 3 session.interview state is migrated automatically
on load. Additive optional fields; project format stays 1.0.0. | Done.

2026-07-10 | Stage 4 | Contradiction detection (rule-based): any covered
area can be revisited in a later session; if the new answer differs from
the stored answer for that track+area (normalized text compare), the engine
creates a contradiction Gap quoting BOTH answers verbatim and queues a
"which is right?" thread. This may flag complementary re-answers as well as
true conflicts - asking "which is right, or are both true?" is safe either
way, and conservative beats silent. | Done.

2026-07-10 | Gate | Stage 4 delivered; Carla directed "Next stage".
Stage 5 authorized. | Logged.

2026-07-10 | Stage 5 | Documents are stored on the project file
(ProjectFile.documents: id, name, addedAt, text - additive optional field,
format stays 1.0.0). Full text is kept so conflicts can quote the document
verbatim and the owner can re-audit extraction later. | Done.

2026-07-10 | Stage 5 | Rule-based document extraction: every non-empty
line becomes a Fact verbatim (source kind 'document' + documentId + line
number, confidence high per spec's documents-are-authoritative rule,
verified false). Undefined names create Gaps exactly as in interviews. No
paraphrase, no synthesis - the honest rule-based ceiling, consistent with
the Stage 3 ruling. | Done.

2026-07-10 | Stage 5 | Conflict rule (deterministic): a document line and
an interview fact conflict when they share 3+ significant content words
AND their month-names or numbers are non-empty, differing sets. The
conflict Gap quotes both verbatim and asks which is right. Resolution is
owner-directed in the UI: the chosen statement gets verified=true, the
other drops to confidence low ("both true" verifies both); the gap is
marked resolved; NOTHING is deleted. Owner-directed modification is
attributable modification, satisfying rule 9. | Done.

2026-07-10 | Gate | Stage 5 delivered; Carla directed "Stage 6". Authorized. |
Logged.

2026-07-10 | Stage 6 | Renderer integrity mechanism: every deliverable is
built through a Doc helper whose c() function registers each model-derived
string as it is emitted. The automated audit then verifies every registered
string appears verbatim among the model's field values. Static template
labels (headings, connective text) are not model content and are exempt.
This makes the spec's "audited line-by-line against the model" requirement
a running test, not a one-time manual check. | Done.

2026-07-10 | Stage 6 | Verification markers: any rendered entity with
verified=false carries "(needs verification)"; confidence low additionally
carries "(low confidence)". Empty sections render the literal words
"Not yet captured." - never sample text, never a synthesized filler. | Done.

2026-07-10 | Stage 6 | Versioning: ProjectFile.deliverableVersions (additive
optional field) increments per deliverable on each package generation.
Version and generation date print in every document header. | Done.

2026-07-10 | Stage 6 | Export formats: per-deliverable markdown download,
full-package markdown download, model JSON (deliverable 9), and a
print-friendly view using the app's serif visual system via the browser's
print function. | Done.

2026-07-10 | Gate | Stage 6 delivered; Carla directed "Stage 7". Authorized. |
Logged.

2026-07-10 | Stage 7 | Risk scoring (deterministic, 0-100): base 40;
+25 if riskKind names a single point of failure; +20 if no mitigation is
on record; +10 if unverified; +5/-0/-5 for high/medium/low confidence in
the risk itself; capped at 100. Bands: 70+ high, 40-69 medium, under 40
low. The formula is printed in the Risk Report so owners and advisors can
see exactly why a number is what it is - no black box. | Done.

2026-07-10 | Stage 7 | Dashboard metrics: completeness (areas covered of
44, per track), risks (count, bands, average score), gaps (open/queued/
resolved), verification (verified vs unverified), freshness (days since
newest capture; items older than 90 days counted stale). Reconciliation is
a standing test: every dashboard number is independently recounted from
raw model JSON and must match exactly. | Done.

2026-07-10 | Stage 7 | Gap resolution is owner-directed from the dashboard:
"Mark resolved" sets status resolved and updates the timestamp; nothing is
deleted. This also serves as the contradiction-resolution home noted at the
Stage 4 gate. | Done.

2026-07-10 | Stage 7 | Gate evidence substitution (precedent: Stage 2): no
browser here for dashboard screenshots; the reconciliation table is
generated programmatically by the real code and the dashboard can be
screenshotted from the delivered zip. | Logged.

2026-07-10 | Correction | Earlier Stage 7 decision text said "44 areas";
the true total is 50 (Track 1 has 8 areas, Tracks 2-8 have 6 each). The
reconciliation test asserts 50. Noting rather than editing history. | Logged.

2026-07-10 | Gate | Stage 7 delivered; Carla directed "Stage 8". Authorized. |
Logged.

2026-07-10 | Stage 8 | Hardening changes: keyboard-accessible file inputs
(.visually-hidden replaces display:none), top-level ErrorBoundary, empty-
answer nudge in interviews, "model" jargon removed from a user-facing
button, 08-docs HELP.md and DISCLAIMER.md written. Acceptance run is a
standing automated test (07-testing/acceptance.test.ts, mirrored in
app/src) so the Definition of Done is re-proven on every test run. | Done.

2026-07-10 | Build review | Carla requested a full cohesion/consistency
review. Findings and fixes in 07-testing/build-review.md: HANDOFF.md
de-staled to govern future work; boilerplate app/README.md replaced;
package renamed successor-app; topic-convention note added to the schema
README. Frozen contract, control-file accuracy, integrity semantics,
disclaimer, voice, and navigation all verified consistent. | Done.

2026-07-10 | Post-review improvements (Claude Code, branch
feature/structured-knowledge-capture) | Three enhancements addressing the
biggest gap surfaced in review: without structured capture, real (non-fixture)
use only ever creates facts, gaps, and risks - so the Relationship Map,
Decision Playbook, and Memory Archive render mostly "Not yet captured".

  A. Direct structured capture (app/src/knowledge-model/capture.ts): pure,
  tested add functions for relationships, decisions, processes, judgments,
  history, systems, commitments, plus patchEntity (owner-directed field edit)
  and setVerified. PROVENANCE: a directly-entered entity is the owner asserting
  their own knowledge, so source kind is 'interview' (came from the owner) with
  detail "Entered directly by the owner", confidence 'high', verified=true - the
  owner is the source of truth for their own business, so these carry no "needs
  verification" marker. This EXTENDS the Stage 3/5 policy (facts verbatim; only
  gaps/risks inferred) with a fourth path: owner-authoritative direct entry. It
  does not touch the frozen schema and does not weaken any guarantee - directly
  entered strings are the owner's, not invented. Unfilled required-by-type
  strings default to "Not yet captured" (audit-safe, consistent with the app).
  Nothing deletes (rule 9); edits bump updatedAt (attributable). 10 unit tests.

  B. Owner-facing Knowledge screen (KnowledgeScreen.tsx): "Everything on record"
  - browse every entity type in plain language, add the structured types the
  interview does not reach, confirm items, and correct any field inline. Wired
  into App as a new 'knowledge' screen with a "Review & add knowledge" entry on
  the project screen. Data-driven over a per-type field config; list fields
  (steps, criteria) are add-only for now (patchEntity handles string/boolean).

  C. Component-test harness: added dev-only deps jsdom + @testing-library/react
  + @testing-library/dom (dev dependencies for testing are justified; the
  alternative was an entirely untested UI layer). Per-file `@vitest-environment
  jsdom` pragma keeps the existing node tests fast. New tests: KnowledgeScreen
  (add / inline-edit / verify-toggle / form-scoping) and an App shell smoke test
  that drives create-project end to end - the first coverage of App.tsx.

  73 tests passing (was 56 on master); clean build + lint. Browser-verified via
  the jsdom component tests (real DOM render + events). Branch off master,
  independent of the LLM adapter. Awaiting Carla's review. | Proposed.

2026-07-13 | Expansion (Claude Code, branch feature/data-at-rest-encryption,
baseline re-verified 74/74) | Data-at-rest encryption (roadmap item B in
NEXT-STEPS / EXPANSION-HANDOFF §6). Addresses the one real exposure a
2026-07-12 security look found: the knowledge model was stored in localStorage
as plaintext, readable by anyone with the machine or browser profile via
devtools.

  DESIGN: all crypto lives behind the existing StorageLike seam, so
  ProjectStore and every screen stay synchronous and untouched (the frozen
  schema is likewise untouched). Two new modules, both zero-app-dependency so
  they can travel with the shared knowledge-model package later:
  * app/src/project/crypto.ts - WebCrypto only, NO new npm deps. PBKDF2-SHA256
    (250k iterations) stretches the passphrase; AES-GCM 256 seals each value
    with a fresh 12-byte IV; envelope format "v1:<b64 iv>:<b64 ciphertext>".
  * app/src/project/vault.ts - EncryptedStorage implements StorageLike. It
    keeps decrypted project entries in an in-memory Map (the session's working
    copy) so reads/writes remain synchronous; writes update the Map, then
    encrypt through to localStorage on a serialized async queue (flush()
    awaits them). enable() adopts existing plaintext projects and re-seals
    them in place (self-healing if interrupted); unlock() verifies the
    passphrase against a sealed check-token before touching any data; disable()
    rewrites plaintext and drops the marker.

  CREDENTIALS RULE (rule 4): the passphrase and derived key are memory-only,
  never written anywhere. The vault marker on disk holds only a non-secret
  salt, the KDF parameters, and the sealed check-token.

  NEVER-DELETE RULE (rule 9): the locked-out recovery path (UnlockScreen
  "Forgotten your passphrase?") downloads an encrypted backup of the ciphertext
  BEFORE clearing this computer, so a reset preserves rather than destroys.
  Export stays plaintext - the owner's explicit backup action.

  OPT-IN, not mandatory: existing plaintext projects keep working; the owner
  turns protection on from the home screen (passphrase twice + an explicit
  "cannot be recovered" acknowledgement). This avoids stranding anyone behind a
  forgotten passphrase and keeps the additive, no-regression posture.

  THREAT SCOPE (documented honestly in 08-docs/SECURITY.md): this protects data
  AT REST. It does not defend an already-unlocked running session - the app
  must operate on plaintext in memory - and the app-level PBKDF2 is a real but
  not hardware-grade KDF. Deferred follow-ups: change-passphrase, and a real
  browser spot-check on top of the jsdom + real-WebCrypto component coverage.

  90 tests passing (was 74): crypto.test.ts (6), vault.test.ts (8, incl. a
  ProjectStore-over-vault end-to-end and an at-rest "no plaintext leaks"
  assertion), security.test.tsx (2, real DOM enable/lock/unlock/remove).
  Clean build + lint. | Proposed.

2026-07-10 | Maintenance (Claude Code, baseline re-verified 57/57) | Merge
report fidelity fix: mergeEntity excluded 'updatedAt' from the content-
change loop (now consistent with 'createdAt'/'sources'/'verified', which
are all set explicitly afterward). Before this, re-merging content-
identical entities that carried only a newer updatedAt was reported as
action:'updated' with fieldsChanged:['updatedAt'], inflating the report's
"updated" count; the merged entity still takes the newer timestamp. This
changes only the human-facing MergeReport labeling, not merge semantics
(nothing deletes, sources union, newer non-empty content wins) or the
frozen Stage 1 schema. Added a regression test asserting a newer timestamp
with identical content reports 'unchanged'. Branch
maintenance/merge-report-timestamp-fix, awaiting Carla's review. | Proposed.

2026-07-13 | Expansion (Claude Code, branch feature/list-field-editing,
baseline re-verified 74/74) | Finish structured capture (roadmap item B /
NEXT-STEPS §3C): make the array fields on captured entities editable
item-by-item, not just add-only at creation. Before this, once a process or
decision existed, its steps / criteria / thresholds / "who else knows" were
invisible on the Knowledge screen and could not be corrected; patchEntity only
handled string/boolean fields.

  A. capture.ts - three pure, attributable list functions plus a reader:
  addListItem / editListItem / removeListItem / listFieldValues, over the
  editable list fields (steps, dependencies, failurePoints, whoElseKnows,
  realCriteria, thresholds, quirks). They edit items as ordered plain strings
  and map back on write; a process's steps (ProcessStep {order, description})
  are renumbered 1..n on every change so order stays contiguous. Every change
  bumps updatedAt; a no-op transform returns the input model unchanged; blank
  adds/edits and out-of-range indices are no-ops; non-list fields and unknown
  ids throw rather than corrupt.

  REMOVAL vs rule 9: removeListItem is the ONLY removal in capture.ts. It is
  owner-directed, item-level correction of a list the owner themselves
  populated (e.g. a mistaken step) - an explicit, attributable edit (updatedAt
  bumps), not a silent drop. No entity is ever deleted. This extends the
  existing owner-authoritative edit path (patchEntity already replaces string
  values); the module header comment was updated to say so accurately.

  B. KnowledgeScreen.tsx - the entity card now renders each list field with an
  inline editor: every item is a text input (commits on blur / Enter) with a
  Remove button, plus an "Add another" row. Scalar-field editing and the bulk
  newline Add form are unchanged. patchEntity still ignores array fields, so
  the scalar "Save changes" path cannot clobber a list.

  Frozen schema untouched; no new dependencies. 82 tests (was 74): capture
  list-field unit tests (7, incl. step renumber on middle-removal, string[]
  edit/remove, purity, no-op/throw guards) + a KnowledgeScreen component test
  (real DOM add/edit/remove on a process step list). Clean build + lint.
  Branch off master, independent of the encryption and LLM branches. | Proposed.

2026-07-13 | Expansion (Claude Code, branch feature/storage-durability,
baseline re-verified 74/74) | Robustness & durability (roadmap item E, the
non-speculative parts). Two concrete data-safety fixes at the model/store
layer; NO UI threading and NO mergeModels() wiring (the handoff defers that
until a real sync path exists - wiring it now would be build-ahead).

  A. Collision-resistant ids (model.ts). newId kept only the first 8 hex chars
  of a UUID (32 bits; ~50% birthday collision by ~77k ids). Because
  validateModel rejects duplicate ids, a collision would fail the very save it
  belongs to and lose the new entity. Now newId uses the full 122-bit UUID,
  with a getRandomValues (16-byte hex) fallback and a widened Math.random
  last resort. The readable prefix (rel_/proc_/…) is preserved. Test: 20k
  draws, all unique, prefix intact.

  B. Durable saves (store.ts). Added a one-deep backup slot per project under
  BACKUP_PREFIX = 'successor:project-backup:' (deliberately NOT under PREFIX,
  so list() never sees a phantom project):
  * save() copies the current primary to the backup BEFORE overwriting - but
    only if that current value is itself valid, so corruption never reaches
    the backup; the backup write is best-effort and never blocks the real save.
  * save() maps a failed primary write (the likely cause is a full quota) to a
    clear, actionable error; the prior primary is untouched, so nothing on disk
    is lost.
  * load() transparently recovers from the backup when the primary is missing
    or corrupt (unparseable/invalid), costing at most the single most recent
    change rather than the whole project. Missing+no-backup still throws the
    existing "No saved project" message.
  * remove() now clears the backup too, or a deleted project could resurrect
    from its backup on the next load.

  Frozen schema untouched; no new dependencies; no behavior change on the happy
  path (existing 74 pass unchanged). 80 tests (was 74): +1 newId uniqueness,
  +5 store durability (recover-from-corrupt, never-back-up-corruption, quota
  error with primary intact, remove-clears-backup, list-ignores-backups).
  Clean build + lint.

  CROSS-BRANCH NOTE for whoever merges this WITH feature/data-at-rest-encryption
  (PR #4): that branch's EncryptedStorage only encrypts keys under
  'successor:project:'. The new backup keys use 'successor:project-backup:', so
  if both land, backups would be written in PLAINTEXT, undercutting the
  encryption guarantee. Reconciliation: widen the vault's project-key predicate
  to also cover the backup prefix (and include backups in enable/unlock/disable
  and exportSealed). Flagged so it is not missed. | Proposed.

2026-07-13 | Gate / Integration (Claude Code) | Merged PRs #5
(feature/list-field-editing), #6 (feature/storage-durability), and #4
(feature/data-at-rest-encryption) to master, in that order, at Carla's
direction ("merge 4-6"). Doc-file conflicts (STATE/NEXT-STEPS/DECISIONS) were
resolved by keeping every entry.

  RECONCILIATION PERFORMED (the cross-branch interaction flagged in the #6
  entry): #6 introduced the durability backup slot under BACKUP_PREFIX
  'successor:project-backup:', which #4's EncryptedStorage did not manage - so
  as-merged, backups would have been written in PLAINTEXT and would not be
  loaded for recovery. Fixed in vault.ts: the vault's managed-key predicate is
  now isManagedKey() = PROJECT_PREFIX OR BACKUP_PREFIX, so enable() adopts and
  seals pre-existing plaintext backups, unlock()/loadAll() load backups into
  the working copy (recovery works across sessions), and exportSealed() covers
  them. Two tests added (backup sealed at rest + recoverable through the vault;
  enable seals a pre-existing plaintext backup). list() still shows no phantom
  project because BACKUP_PREFIX does not start with ProjectStore's PREFIX.

  Full merged suite: 106 tests passing (74 base + 8 list-field + 6 durability +
  16 encryption + 2 reconciliation), clean build + lint. Frozen schema
  untouched throughout. Remaining follow-up: an optional real-browser spot-check
  of the passphrase flow (jsdom + real WebCrypto already exercise it). | Merged.

2026-07-13 | Perf (Claude Code, branch perf/code-split-screens, /impeccable
optimize) | Route-level code splitting. The app shipped as a single ~283KB /
87KB-gzip chunk; the Home/New/Project shell is all a first visit needs. The six
navigation-only screens (Interview, Documents, Knowledge, Deliverables,
Dashboard, ModelInspector) are now React.lazy() imports behind one Suspense
boundary in App.tsx, so their heavy deps - the 8-track interview engine, the
nine deliverable renderers, document extraction, dashboard metrics, and the
7KB demo fixture - split out of the initial bundle and load on first navigation
to each screen.

  MEASURED (production build, before -> after): initial JS 87.2KB -> 69.0KB
  gzip (~21% smaller; 283KB -> 222.7KB raw). Deferred chunks are 1-5KB gzip
  each, loaded on demand; the demo fixture.ts moved into the dev-only
  ModelInspector chunk, out of the production initial load. Verified: 106 tests
  pass, clean build + lint. No behavior change (the eager Home/New/Project path
  and every screen render identically; Suspense fallback is a quiet "Opening…"
  that is imperceptible for local 1-5KB chunks). Honest note: the app was
  already fast (local-first, no network/images/web-fonts) - this is a real
  payload/parse win and future-proofing as more screens land, not a fix for a
  perceived slowness. Frozen schema untouched; no dependency changes. | Proposed.

2026-07-14 | UX fix (Claude Code, branch fix/scroll-to-top-on-navigation) |
Scroll-to-top on view change. The app is a single-page screen switch; the
browser preserved the prior scroll position across every screen swap, so a new
(often shorter) view opened part-way down - reported when "Start a new project"
opened mid-page. One class of bug in three places, all fixed the same way
(window.scrollTo(0,0) in a useEffect keyed on the value that identifies the
view): App.tsx (keyed on `screen`, covers all top-level navigation),
DeliverablesScreen (keyed on `openId`, the list <-> read-a-document swap), and
InterviewScreen (keyed on `trackId`, the picker <-> questions swap). Deliberately
NOT applied where a scroll would harm: keyed on the view identifier only, so
answering an interview question (no trackId change) keeps the reader on the
feedback line, and the Knowledge "+ Add" form expands in place. No logic or
schema change; behavior-only. Verified: 106 tests pass, clean build + lint. | Merged.

2026-07-15 | Docs / hygiene (Claude Code, branch docs/readme-and-env-gitignore,
PR #10) | Added a top-level README.md (what Successor is, how it works, how a new
person runs it), grounded in the spec and the shipped app. Frames inputs honestly:
interviews + pasted/plain-text documents today, with PDFs/OCR/audio/video as a
documented roadmap. Also hardened both .gitignore files to ignore .env / .env.*
(keeping .env.example) - important because this is a browser-only app where a
bundled key would not be secret, so no API key should ever be committed. No app
code or schema change. Verified no .env was tracked (git check-ignore). | Merged.

2026-07-15 | Roadmap direction (Claude Code) | Richer inputs are LOCAL-FIRST.
Successor will accept more input types than typed answers and pasted text -
planned: PDF text, in-browser OCR for scans/images, audio, then video - all
folding into the same frozen knowledge model. Decision: build these local-first
(in-browser), in that order. Cloud processing (higher accuracy/speed for audio,
video, poor scans) is DEFERRED, not deleted: if ever added it must be strictly
opt-in with the owner's own key, never stored, mirroring the optional AI adapter
(#3) - never a quiet exfiltration of private business knowledge. Rationale: the
product's core promise is "nothing leaves your computer"; PDF and OCR keep that
promise with little compromise, and audio/video are where the local-vs-cloud
fork is real. Nothing built yet (governance: never build ahead). See
PATH-TO-SHIP.md Tier 4. | Deferred (direction set).

2026-07-15 | Product / ship-readiness (Claude Code) | Captured the gap between
the completed staged build (done, green) and a shippable product in a new
00-control/PATH-TO-SHIP.md. Three owner decisions gate the work (distribution:
hosted website vs. desktop app; free vs. paid v1; AI adapter #3 in or out of v1)
followed by Tier 1 (distribution, data-durability hardening, real-browser
testing), Tier 2 (WCAG AA audit, real PDF export, security review, onboarding),
Tier 3 (privacy/terms, licensing/payment, update+support), Tier 4 (rich inputs,
Role DNA schema sharing, cloud sync). Highest pre-ship risk: data durability
(knowledge currently lives in browser localStorage). Session handoff written to
00-control/HANDOFF-2026-07-15.md; STATE.md updated. | Proposed (owner decisions
pending).

2026-07-16 | Workspace structure (Claude Code) | SPEC AMENDMENT. CLAUDE.md moves
from 00-control/ to the repo ROOT and lives there and nowhere else; a new root
CONTEXT.md carries the stage map / task routing. MASTER-SPEC.md's workspace
table (line 125) is amended to match: CLAUDE.md and CONTEXT.md at root,
00-control/ keeps STATE.md, DECISIONS.md, the spec, and the handoffs. Rationale:
owner directive 2026-07-16, and root is where a fresh agent session actually
looks for operating rules - a nested CLAUDE.md is not reliably loaded, so the
non-negotiables (never fabricate, no stored credentials, frozen schema) were one
directory further away than the rules that matter most should ever be. Deviating
from the spec silently is forbidden by CLAUDE.md rule 5, hence this entry. Moved
with git mv (history preserved as a rename); all path-bearing references updated
(STATE.md resume path, HANDOFF.md, HANDOFF-2026-07-15.md, app/README.md,
CONTEXT.md). Bare "read CLAUDE.md" mentions were left alone - still true.
| Done (owner-directed).

2026-07-16 | 06-export documentation (Claude Code) | Wrote 06-export/README.md.
The folder was specified at MASTER-SPEC.md:131 in Stage 0 and had sat EMPTY ever
since - the only unpopulated workspace folder. The functionality was never
missing: it shipped across Stages 2/4/6 and is documented now, not built. Three
distinct exports, previously undocumented and easy to confuse: (1) project
export/import, lossless round-trip, ProjectStore.exportJson/importJson
(store.ts:202/206), validate-before-accept, migrate-on-load; (2) sealed export,
EncryptedStorage.exportSealed (vault.ts:224), AES-GCM under the owner's
passphrase, passphrase never exported so a sealed file without it is
unrecoverable by design; (3) AI-ready knowledge export, the ninth deliverable
(render.ts:268/288), renders via exportModel through Doc.c() so auditRendered()
still proves zero invention. Noted: mergeModels() remains unwired - import
replaces, never merges. | Done.

2026-07-16 | ICM conformance (Claude Code) | Audited the workspace against the
Interpretable Context Methodology (Van Clief & McDermott, arXiv:2603.16021) and
logged ICM-AUDIT-LOG.md at root: 6/24, "weak". Decision: do NOT convert to the
paper's stages/NN_name/{CONTEXT.md,references/,output/} tree. Rationale: this is
an application repo whose numbered folders are documentation domains describing
app/src/, not stages an agent flows through; it already conforms exactly to its
own spec (MASTER-SPEC.md:123-133). Converting would rewrite cross-references
across DECISIONS.md (referenced by 23 files), STATE.md, and the handoffs, and
break the documented resume path, against a build that is complete and green at
106 tests. Three competing structures exist and the target must be settled
before any conversion: the paper's ICM, the master prompt's 18-folder
ICM_WORKSPACE (00-control..17-commercialization, never built - see the owner's
own critique), and what was actually built (9 folders). Cheap non-breaking wins
taken instead: root CONTEXT.md (ICM-05), CLAUDE.md to root (ICM-06),
06-export documented (ICM-09). | Audited; conversion declined pending owner
decision on which ICM is the target.

2026-07-16 | Correction to 06-export docs (Claude Code) | The first draft of
06-export/README.md described exportSealed's PURPOSE from its signature and from
STATE.md prose rather than from the source, and got it wrong: it claimed the
function was for "handing a project to someone who should hold the file but not
the contents." The docstring (vault.ts:218-223) says the opposite job - it lets a
locked-out owner preserve ciphertext before resetting so a reset never destroys
data (integrity rule 9). Also corrected: exportSealed takes no projectId, it
sweeps every managed key (projectKeys/isManagedKey, vault.ts:40-41,69-75) - all
projects AND their backup slots - so it is a whole-vault dump, not a per-project
export. Verified-and-kept: importJson validates before saving and throws, never
partially applying (store.ts:206-219); PBKDF2/SHA-256 at KDF_ITERATIONS=250_000
and AES-GCM 256-bit (crypto.ts:18-21). Rationale for logging a docs correction:
the error was plausible-sounding invention presented with file:line citations -
precisely what rules 6 and 7 forbid - and it survived a full session because it
read as authoritative. Noted for future sessions: grep gives signatures, not
behaviour; read the body before documenting what a function is FOR. | Corrected.

2026-07-16 | Stage map corrections (Claude Code) | Second correction pass on the
same root cause as the exportSealed error: CONTEXT.md's first draft inferred its
"built in" column from folder numbers and README headers rather than from the
spec's staged build plan, and two rows were wrong. (a) 06-export was labelled
"Stage 2". It spans three: model JSON export/import came with the frozen contract
in Stage 1 (MASTER-SPEC.md:149-150), project save/load/resume/export in Stage 2
(:154-155), and the AI-ready export renderer shipped as the ninth deliverable in
Stage 6. Note spec-vs-built drift, recorded not smoothed: the spec assigned AI
export to Stage 7 (:178-180); as built it landed in Stage 6, with Stage 7
contributing export-validates-against-schema evidence. Sealed export came later
still (PR #4, 2026-07-13). (b) 08-docs was labelled "Stage 8". It spans Stage 2
(VISUAL-SYSTEM.md, per its own line 1 and spec :154), Stage 8 (HELP.md,
DISCLAIMER.md), and post-build 2026-07-13 (SECURITY.md, PR #4). Both rows now
cite their sources inline, and the numbering caveat points readers at
MASTER-SPEC.md:143-186 rather than the folder prefix. | Corrected.

2026-07-16 | Area count corrected: 44 -> 50 (Claude Code) | STATE.md contradicted
itself: the Stage 4 entry said "44 areas total" while the Stage 7 entry said
"completeness of 50 areas". EXPANSION-HANDOFF.md said "8 tracks / 50 areas".
Counted from the source (TRACKS in app/src/interview/engine.ts, area entries
inside the areas[] blocks): 50 areas across 8 tracks. 50 is correct; STATE.md's
Stage 4 line was wrong and has been fixed with a note. CONTEXT.md had inherited
the wrong 44 from STATE.md and is corrected too. metrics.ts never hardcoded
either number - it computes totalAreas by summing perTrack, which is why no test
caught the drift. | Corrected.

2026-07-16 | EXPANSION-HANDOFF refresh (Claude Code) | The roadmap document was
written 2026-07-11 and had gone stale enough to be actively harmful: it listed
master at 56 tests (106), showed PRs #1/#2 as pending review when both had
merged, omitted #4/#7/#9/#10/#11 entirely, and its roadmap told a future session
to fix newId's collision-prone 8-char suffix and add quota handling/backups -
all shipped in PR #6 on 2026-07-13. A session following it would have redone
finished work. Refreshed against verified state: PR table rebuilt from git
history, done items marked DONE rather than deleted (so a later reader sees they
were considered and closed, not dropped), local path corrected (repo moved under
Downloads/apps/), CLAUDE.md/CONTEXT.md root locations reflected, roadmap item I
(richer inputs, local-first) added from the 2026-07-15 decision, and a pointer to
PATH-TO-SHIP.md added at the top since shipping now gates sensibly picking any
roadmap item. Preserved verbatim: section 5 non-negotiables (still exactly
right) and the section 4 architecture map (still accurate; its "8 tracks / 50
areas" was correct where STATE.md was wrong). Also fixed NEXT-STEPS.md:130,
which still listed CLAUDE.md under 00-control/ - a list-phrased reference the
earlier path-based grep missed. | Done.

2026-07-16 | P1 Provenance depends on who is typing (Claude Code) | DEFECT, found
by reading capture.ts against the owner's service model. capture.ts hardcoded
EVERY structured entity it created as source kind 'interview', detail "Entered
directly by the owner", confidence 'high', verified=true. The Stage-2 rationale
(":241-246", the owner is the source of truth for their own business) is sound
ONLY while the owner is the one typing. The owner now intends to run the
interviews himself as a service and hand back reports - so HE types the
structure, interpreting the owner's verbatim answers. Every commitment, process
and relationship he created would have carried provenance asserting the owner
entered and confirmed it. Nobody did. That is a false attribution in the single
field the entire product rests on (rules 6, 7, 9), and it was invisible because
every doc assumes owner==user. Fix: capture.ts gains an Attribution parameter
({enteredBy: 'owner'|'operator', operatorName?, structuredFrom?}) defaulting to
OWNER, so existing behaviour and all prior call sites are unchanged. enteredBy
'operator' yields kind 'inferred' (structuring someone's words IS
interpretation), confidence 'medium', verified=FALSE, and detail "Structured by
<name> from <source> - not yet confirmed by the owner". Deliverables therefore
render operator-entered knowledge "(needs verification)", which is true. NO
SCHEMA CHANGE: 'inferred' is an existing SourceKind and the trail back to the
verbatim fact rides in SourceRef.detail. This completes a workflow that was
already built but unreachable: nothing was ever born unverified, so setVerified()
(the owner's promotion path) had nothing to promote. Now: operator structures ->
renders unverified -> owner reviews -> setVerified -> confirmed. KnowledgeScreen
gains a "Who is entering this?" control (memory-only for the sitting; the choice
persists where it belongs, inside each entity's SourceRef). +9 tests incl. 3
component tests proving the UI actually threads it - a correct capture.ts wired
to a default-only screen would still have recorded operator entries as the
owner's. | Done.

2026-07-16 | P3 The May bug (Claude Code) | DEFECT. "First Year Without the
Founder" placed facts on the month-by-month calendar with
`f.statement.toLowerCase().includes(month.toLowerCase())` (render.ts:186).
MONTH_NAMES contains 'May', so every statement using the modal verb - "we may
need to order early" - was filed under May in a client-facing deliverable.
'March' (the verb) and 'August' (the adjective) had the same flaw; 'Mayfair'
and 'Augusta' matched too. Notable: extract.ts already guarded against exactly
this by excluding MONTHS from contentWords (:50) - render.ts simply never got
the same care. Fix: factsMentioningMonth() matches on word boundaries, and
case-SENSITIVELY for the three month names that are also ordinary English words
(months are proper nouns; an owner writing about May capitalises it). The nine
unambiguous names stay case-insensitive so a lowercase "january" still lands.
+5 tests. | Done.

2026-07-16 | P4 Name-gap noise (Claude Code) | DEFECT. detectUndefinedNames
flagged every capitalised non-initial word individually, so the Stage 5 fixture
- a FOUR-line vendor list - raised ELEVEN gaps including "Who or what is
Machine?", "Tool", "Brothers", "Supply" and "FIXTURE": it split the business's
OWN name into three separate mysteries and treated a document label as a person
(evidence has been sitting in 07-testing/stage5-acceptance.md since Stage 5,
never logged as a defect). At 20 employees with real documents this buries the
dashboard's open questions. Four fixes: (1) profileNames() makes the business's
own name and the owner's own name known - applied at DETECTION time, not seeded
into memory, so existing projects get it with no migration; (2) consecutive
capitalised words group into ONE name ("Ed Kowalski" asks one question, not two;
a run whose words are all individually known is known, since punctuation like
"&" splits "Hartwell Machine & Tool"); (3) ALL-CAPS words are labels or
acronyms, not people - "FIXTURE" no longer raises a question; (4) MAX_NAME_GAPS
= 25 per document, with the overflow COUNTED and reported in
AnalysisReport.nameGapsSuppressed, the same bargain MAX_LINES already makes -
facts are never capped, only the questions about them. Same fixture now raises 3
gaps (Valley Brothers Supply, Ed Kowalski, Precision Carbide) instead of 11.
One existing test asserted the old per-word behaviour (expected a gap for "Ed"
OR "Kowalski"); it was updated to assert the better behaviour and is now the
regression guard. +4 tests. | Done.

2026-07-16 | P5 Track 7 answers become owner-declared risks (Claude Code) |
DEFECT of omission. Track 7 is titled "Risks & Fragilities" and asks six
questions about risk - and no answer to any of them ever became a RiskEntity.
Answers landed as facts only; RiskEntities came solely from the ONLY_ME regex
(any track). So the Knowledge Risk Report ignored the six questions explicitly
about risk, and every risk it did show scored an identical 95 (same inputs:
inferred + SPOF + no mitigation + unverified + medium) - a "ranked" register
that ranked nothing. Fix: TrackArea gains optional riskKind; all six Track 7
areas carry one (owner concern / single point of failure / diligence exposure /
fragility / slow leak / outside shock). A substantive primary answer to such an
area is recorded as a RiskEntity too: description = the answer VERBATIM, source
'interview' (the owner said it - this is deliberately NOT 'inferred'; the
engine's integrity note was updated), confidence high, verified false. Guards:
primary answers only (follow-ups and revisits elaborate an area that already
produced its risk), and a leading dismissal ("nothing really...") stays a fact
only - a scored risk reading "Nothing really keeps me up" would be the May bug
all over again. Scoring now has real spread (owner-declared 75, SPOF-flavored
100, inferred SPOF 95) without touching the published formula. Scope note:
track-1 'first-break' arguably also qualifies; left alone deliberately -
conservative first, widen after the pilot shows how Track 7 risks read. +4
tests. | Done.

2026-07-16 | P6 Document lines render grouped, not blockquoted (Claude Code) |
Deliverable-quality fix. The Successor's Handbook rendered every document-
sourced fact as its own blockquote with per-line attribution, so a 500-line SOP
became 500 blockquotes with blank lines between - tripling page count and
burying the interview knowledge the handbook exists to carry. Now grouped under
one h3 per source document (name from ProjectFile.documents - owner-provided
data, not invention; heading not audit-registered, same as the month headings)
and rendered as compact bullets. Capture unchanged: every line is still a
verbatim Fact with document id + line number on its SourceRef, all of it in the
AI export. Only the handbook's presentation changed. | Done.

2026-07-16 | P7 "Not asked" vs "not yet captured" (Claude Code) | Deliverable-
honesty fix for the service model. Every empty section printed "Not yet
captured." - which reads as unfinished work when the engagement DELIBERATELY
scoped to three tracks. Two different truths need two labels: NOT_ASKED ("This
part of the interview has not been asked yet.") when interviewMemory shows the
track/area was never reached, NOT_CAPTURED only when it WAS asked and nothing
is on record - the second being a real gap that belongs in the report.
Implemented in the renderers only (quoteArea() consults trackProgress; handbook
per-track; firstYear/emergencyBrief/decisionPlaybook/memoryArchive per-area).
Entity-backed sections (relationships, commitments, systems...) keep NOT_CAPTURED
- they are populated by structuring, not by reaching an area. The engine's
completion semantics (allComplete = all 50 areas) are deliberately untouched:
that is the engagement-type knob, deferred with P2-A pending the pilot. +3
tests. | Done.

2026-07-16 | Living-doc staleness cleanup (Claude Code) | Follow-through on the
audit that found EXPANSION-HANDOFF actively harmful. Fixed the living docs that
asserted stale facts: README.md:160 claimed "the existing optional AI adapter"
- it does NOT exist on master (draft PR #3); now says so plainly. README's
governing-docs pointer updated for root CLAUDE.md/CONTEXT.md. 02-interview
README: "coverage /8" (wrong for 7 of 8 tracks) and "33-test suite";
03-analysis README: "40-test suite" - counts replaced with a pointer to
STATE.md rather than a new number that would just drift again (the 44-vs-50
lesson: docs that embed counts go stale silently). 05-deliverables README:
"numeric scoring arrives Stage 7" future tense, shipped long ago. HELP.md (the
in-product help): now mentions passphrase protection (shipped 2026-07-13,
including that a forgotten passphrase is unrecoverable) and the .txt/.md/.csv
document limitation - both documented everywhere except the one file users
read. build-review.md: dated point-in-time banner added; it asserted VERIFIED
consistency (56 tests, eight screens) that no longer holds and claimed no
exemption for itself while granting one to other evidence files. Point-in-time
stage evidence files left untouched per their own exemption. | Done.

2026-07-16 | PRs #3 and #8 archived (Claude Code, owner-directed) | Owner:
"leave it for later and archive that and 8 if they aren't being used now."
Verified neither is in use, then closed both on GitHub with rationale comments.
#8 (docs/session-handoff-2026-07-13): superseded by HANDOFF-2026-07-15.md,
pure staleness, no decision content lost. #3 (feature/llm-interview-adapter):
DEFERRED, NOT REJECTED. The owner's decision is only "not before the pilot" -
run the first service engagement structuring by hand, and revive the adapter
if that labor proves to be the bottleneck. Critical for whoever revives it:
the branch predates PRs #4/#5/#6/#7/#9 (a diff against master shows ~4,300
deletions - no vault.ts, crypto.ts, capture.ts, KnowledgeScreen); reviving
means PORTING llm.ts + the InterviewEngine interface onto today's master,
never merging the branch as-is. The adapter design itself is sound and worth
keeping: deterministic rules floor first, LLM only reworder + extractor on
top, every extraction 'inferred'/low/unverified. BOTH BRANCHES ARE RETAINED
on origin as the archive - closing a PR deletes nothing; do not delete
feature/llm-interview-adapter. This also finally gives #3 the explicit
status the decision log never had (flagged in the 2026-07-16 audit). | Done.

2026-07-17 | Role-level interviews, role-holder first (Claude Code, owner-
directed) | Owner's principle, verbatim: "Each person in a role should be
interviewed and the business owner only as a fallback. Who knows the actual
job better, right?" This inverts the build's owner-centric assumption and
activates the subjectRole seam that has sat inert since Stage 1. Design:
(a) ROLE_TRACKS - 7 tracks / 44 areas addressed to the person who DOES the
job (the job as it really is; how the work gets done; people & handoffs;
judgment calls; problems & fixes with riskKind areas mirroring track-7;
history & quirks; handing it off). trackSetFor(subjectRole) selects the set;
'owner' keeps the original eight untouched. (b) NO SCHEMA CHANGE: subjectRole
(existing free-text field) carries the role title; the interviewee's NAME is
attribution (session labels, SourceRef.detail), never identity - the model
documents the ROLE, per the product's original boundary ("an employee may
leave, but the knowledge associated with the role should remain"). A
subjectName field on the frozen profile was considered and rejected as
unnecessary unfreezing. (c) Engine methods take an optional subjectRole
(default 'owner' - all existing call sites and behaviour unchanged);
completion, coverage, metrics and the handbook/summary renderers judge
against the active set. (d) NewProjectScreen asks what the project is about
(owner's knowledge vs one specific job + role title) with role-holder-first
"why we ask" copy; "Your name" label became "The owner's name" since the
typist may be the operator. KNOWN INTERIM LIMITATION, logged not hidden: the
owner-specific deliverables (First Year Without the Founder, and the
track-5/6/8 quote sections of Decision Playbook / Memory Archive / Emergency
Brief) reference owner track ids, so for role projects those sections render
"not asked" - honest but thin. A role-appropriate deliverable set is the
follow-up (with the PDF work), not a silent gap. 131 -> 136 tests. | Done.

2026-07-17 | Data custody protocol + deletion caution flow (Claude Code,
owner-directed) | Owner approved the per-engagement custody protocol
(vault-first, export, VERIFY, then delete; encrypted or client-custodied
delivery drives; keep-nothing vs keep-encrypted decided in the engagement
letter) and directed: "I need the app to clearly identify and caution when I
request any files be deleted." Finding: the app had NO deletion in its UI at
all - ProjectStore.remove() existed, tested, wired to nothing - so the
custody protocol's final step was impossible without devtools. Built
DeleteProjectControl on each home-screen project card: names exactly what is
being deleted, warns that the working copy AND the automatic backup slot go
together, states what is NOT touched (exported files, printed reports),
pushes export-and-verify first (with an "Export a copy now" button in the
flow), and keeps the destructive button DISABLED until the operator attests
to a verified exported copy. Cancel resets the attestation. Deliberate
friction, in keeping with rule 9's spirit: this is the one place captured
knowledge can leave the store. Protocol written to 08-docs/CUSTODY.md
(including the honest limits: app deletion is not forensic erasure, which is
why vault-first is step 1; plaintext export is the drive's weak point);
HELP.md gained the user-facing paragraph. 136 -> 138 tests, incl. the
disabled-until-attested gate and primary+backup removal. | Done.

2026-07-17 | Real PDF export + first runtime dependency (Claude Code, owner-
approved plan) | The report IS the product in the service model, and browser
"Print to PDF" is not a client deliverable - PATH-TO-SHIP Tier 2, promoted.
DEPENDENCY DECISION (spec: "no unnecessary dependencies" - this one is
necessary): pdfmake 0.3.11. Considered: hand-rolled PDF writer (rejected:
accurate glyph-width tables cannot be reproduced from memory without
fabrication risk; Courier-only would dodge that but reads as a typewriter,
not a professional deliverable); jsPDF (rejected: manual text placement);
@react-pdf (rejected: heavier, own component world). Two mitigations make
pdfmake nearly free: (a) it is imported ONLY via dynamic import inside
generatePdfBytes(), so it lives in lazy chunks (pdfmake 346KB gzip + Times
AFM 49KB + Courier 12KB) fetched on the first PDF click - the initial bundle
is unchanged by it; (b) the PDF uses the STANDARD-14 Times/Courier fonts via
pdfmake's addFontContainer (AFM metrics only, no TTF embedding - verified by
probe before wiring), which matches the visual system's serif printed-page
feel and keeps output small. The converter (pdf.ts markdownToPdfContent) is
PURE, knows only the markdown subset our own Doc generator emits, and never
sees the model - it reshapes exactly what the zero-invention audit already
covers. UI: per-document "PDF" buttons and "Download the whole package
(PDF)" (one file, page break per document) on DeliverablesScreen, with a
busy state and a markdown fallback message on failure. Tests: converter
unit tests + a REAL-BYTES test running pdfmake headless over the full
fixture package (asserts %PDF header, multi-page, Times-Roman present,
Roboto absent). | Done.

2026-07-17 | Role-project deliverables (Claude Code) | Closes the interim
limitation logged with the role-interviews decision: role projects no longer
render owner-shaped documents full of "not asked". Same nine documents, same
ids (versions and navigation unchanged); three titles speak about the job
(The Role Handbook; The First Year in the Role; Relationship & Handoff Map);
each renderer is subject-aware through one subjectWords() helper - the
header line becomes "documenting the role of X, in the words of the person
who does it" (X = subjectRole, registered with the audit; the role-holder's
NAME never appears in identity lines, per the attribution decision), and the
quoted areas map to ROLE_TRACKS (deciding: role-4; scar tissue: role-6;
annual/first-break: role-1; change-slowly/never-change/meet-first: role-7).
Owner projects are unchanged - subjectWords returns every original string.
Tests: 138 at the prior commit -> 150 with the PDF and role-deliverable
suites (the first draft of this entry claimed 157 - a miscount, corrected
before it could mislead; the commit message says 157 too and commit messages
are immutable, so this line is the correction of record). | Done.

2026-07-17 | Operator polish: persistent name + structuring workbench (Claude
Code) | Completes the approved pre-pilot batch (role interviews, deletion
caution, PDF export, this). Two pieces. (a) ProjectFile gains operatorName? -
optional and additive like every prior extension; app-level bookkeeping, NOT
captured knowledge. It only seeds the "Who is entering this?" control when
flipping to operator mode, so the name survives between sittings; the name
that matters is still written into each entity's SourceRef at the moment of
entry, and saving the name does not touch the model (tested: model reference
unchanged). (b) TranscriptSourcePicker - the structuring workbench. Operator
mode shows the verbatim transcript (newest first, filterable, capped at 100
shown with the cap reported, each answer under its interview question via
trackById), with "Use as source": the picked fact's id + source detail flow
into Attribution.structuredFrom, so a structured commitment records e.g.
"Structured by J. Smith from fact_x (Track 3 (handshake), answer 2) - not
yet confirmed by the owner". The selection persists across adds (one answer
often yields several entries - the Henderson answer held two commitments)
and is cleared explicitly. Owner mode never sees the workbench. 150 -> 154
tests. | Done.

2026-07-17 | Assisted interviewing revived (Claude Code, owner-directed: "the
app composes, you review, the owner confirms") | The archived PR #3 ported
onto master - by rewriting against today's code, never by merging the stale
branch (it predates PRs #4-#9). Model: claude-haiku-4-5 per the original
2026-07-10 cost ruling; ~pennies per interview on the operator's own key.
DESIGN CHANGE from the draft, deliberate and better: the adapter is an
ENRICHMENT LAYER, not an engine replacement. RuleBasedEngine keeps ALL
bookkeeping (question selection, coverage, completion, the verbatim Fact
floor) and InterviewScreen SAVES the floor BEFORE any network call; the model
is consulted after, additively, so a failure can never cost captured
knowledge and the UI stays synchronous except for the enrichment step (the
"async UI path" that the draft never verified shrinks to one busy state).
The draft's question-rewording feature was DROPPED, not deferred silently:
in the service model the operator reads questions aloud, so warm rewording
buys nothing; EXPANSION-HANDOFF item C closes with it. Scope delivered:
(a) structured drafts across ALL SEVEN entity types the interview cannot
create - the draft handled 3 and omitted commitments, the highest-value
output; every draft is source 'inferred', confidence 'low', verified=false,
promotable only via setVerified; the extraction prompt forbids recording
credentials (systems record only where access lives). (b) CLARIFICATION
FLAGGING as scoped in EXPANSION-HANDOFF SS6A: the model returns up to
MAX_FLAGS_PER_ANSWER=3 questions about what the answer left ambiguous (P4
noise cap); each becomes an inferred queued GapEntity plus a pendingThread
on the same track/area, so the NEXT sitting opens by asking it - tested
end-to-end (nextQuestion returns the flag). (c) Key handling: React state in
MainApp only, memory-only per sitting, never written anywhere (rule 11);
home-screen panel mirrors SecurityPanel, discloses that answers go to
Anthropic while on, and offers "Turn off and forget the key". (d) LIVE
verification is a guarded vitest file (llm.live.test.ts) that runs the real
client against the real API only when ANTHROPIC_API_KEY is in the
environment - the owner runs it locally with his key; skipped in CI and
normal runs. 154 -> 166 tests + 1 guarded live. Frozen schema untouched;
initial bundle 70.0 -> 72.7 KB gzip (the llm module + panel; accepted -
lazy-loading a 3KB module bought nothing). | Done pending the owner's live
run.
