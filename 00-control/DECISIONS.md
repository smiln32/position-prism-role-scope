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
