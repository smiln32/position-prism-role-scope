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
