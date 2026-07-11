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
