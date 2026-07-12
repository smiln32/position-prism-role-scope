# EXPANSION HANDOFF - Successor

Written 2026-07-11. This document orients a future session (human or AI) that
picks up **expansion** work after the staged build (Stages 0-8) was completed
and the project moved into GitHub. It complements — and for new work,
supersedes — the older `HANDOFF.md`, which covered the one-time move from the
chat environment into Claude Code.

Read this, then `CLAUDE.md`, `MASTER-SPEC.md`, `STATE.md`, and `DECISIONS.md`
before writing code. The frozen contract and the knowledge-integrity rules are
non-negotiable; everything below assumes you will honor them.

---

## 1. What this project is (in one paragraph)

**Successor** captures a business owner's operating knowledge through
structured interviews and document analysis and renders it into a
succession package (nine deliverables). The knowledge model **is** the
product; every deliverable is a view of it and never invents content. It is
explicitly *not* financial/legal/tax advice. React 19 + TypeScript + Vite,
local-first (localStorage), no runtime dependencies beyond React. Sister
product to "Role DNA"; the schema is designed to be shared with it.

For the whole shape at a glance, an architecture/health map was produced as a
Claude artifact during the 2026-07-11 session (regenerate from
`scratchpad/successor-map.html` if you still have it, or rebuild from §4).

---

## 2. Where everything lives

- **Repo:** `github.com/smiln32/successor` (PRIVATE, owner `smiln32`, default
  branch `master`).
- **Local working copy:** `C:\Users\smiln\Downloads\successor-review-build`
  (consider moving out of `Downloads` to a permanent location).
- **App:** `app/` — the runnable application.
- **Workspace/control folders:** `00-control/` (spec, rules, state, decisions,
  handoffs) and `01-schema/` … `08-docs/` (design artifacts, contracts,
  prompts, test evidence, docs). These hold artifacts, not compiled source.

### Environment gotchas on this machine (Windows on ARM64)

- **Node/npm** are installed at `C:\Program Files\nodejs\` but are **not on the
  PATH** for a fresh shell. In PowerShell:
  `$env:Path = "C:\Program Files\nodejs;" + $env:Path` then `npm ...` from
  `app/`. (Node v24, npm 11 as of writing.) See memory note `node-path`.
- **git** lives in the bundled Git-for-Windows used by the Claude Code bash
  tool; it is not on the PowerShell PATH either.
- **GitHub CLI** (`gh` 2.96.0) is at `C:\Program Files\GitHub CLI\gh.exe`,
  authenticated as `smiln32` with `repo` scope. Not on PATH until a reboot;
  invoke by full path, or `$env:Path += ";C:\Program Files\GitHub CLI"`.
- A **reboot** makes `git` and `gh` resolve as plain commands everywhere.

### Build / test / run

```
cd app
npm install
npm run build     # tsc -b && vite build   (type-check + production build)
npm test          # vitest run
npm run lint      # oxlint
npm run dev       # local dev server for manual/browser work
```
Never build on a broken baseline. If build/test/lint aren't clean, stop and
fix before adding anything.

---

## 3. Branch state (as of 2026-07-11)

All four branches are pushed to `origin`. `master` is the finished, approved
build; the other three are **proposed** expansions awaiting review/merge. Each
has a full rationale in its own commit and in `DECISIONS.md` on that branch.

| Branch | Tests | What it adds | Verified? |
|---|---|---|---|
| `master` | 56 | Stages 0-8, Definition of Done met | Yes |
| `maintenance/merge-report-timestamp-fix` | 57 | Merge report counts content changes only (not timestamp bumps) + 1 test | Yes (unit) |
| `feature/llm-interview-adapter` | 68 | Optional Anthropic (Haiku) interview adapter behind a new `InterviewEngine` interface; memory-only key; rule-based fallback | Engine logic unit-tested; **live network + async UI NOT browser-verified** |
| `feature/structured-knowledge-capture` | 73 | Direct structured capture (the 7 entity types the interview never creates) + owner-facing Knowledge screen (browse/add/edit) + first component-test harness (jsdom + @testing-library) | Yes — real DOM component tests |

**Recommended review/merge order** (each is independent; merging into `master`
via PR is the clean path):

1. `maintenance/merge-report-timestamp-fix` — smallest, safe, verified.
2. `feature/structured-knowledge-capture` — verified end-to-end; brings the
   biggest user-facing value (the empty deliverables come alive). Note it adds
   dev-only deps (jsdom, @testing-library/*) — merging brings them to `master`.
3. `feature/llm-interview-adapter` — merge only **after** exercising the live
   path with a real Anthropic key in a browser (see §6). It's off by default,
   so merging is low-risk even before that, but don't call it "done" until the
   network path is proven.

Open PRs on GitHub, or with `gh`:
`"/c/Program Files/GitHub CLI/gh.exe" pr create --base master --head <branch> --fill`.

Because these three branches were cut at different times, two of them touch
`App.tsx` (nav wiring) — expect a small merge reconciliation when the second
one lands. Additive changes, no hard conflicts anticipated.

---

## 4. Architecture (module map)

Data flows: **capture → the knowledge model → views**.

- **Capture** — `app/src/interview/` (rule-based `RuleBasedEngine` in
  `engine.ts`, 8 tracks / 50 areas; verbatim facts, name-gaps, single-person
  risks; the optional `LlmInterviewEngine` in `llm.ts` on its branch) and
  `app/src/analysis/extract.ts` (document line extraction + conflict
  detection). Plus **direct structured capture** in
  `app/src/knowledge-model/capture.ts` on the capture branch.
- **The knowledge model (core)** — `app/src/knowledge-model/`: `schema.ts`
  (frozen v1.0.0, 10 entity types), `model.ts` (validate / export / import),
  `merge.ts` (merge never deletes; dedupe only flags). `app/src/project/store.ts`
  wraps it as the saved project file and handles sessions + migration.
- **Views** — `app/src/deliverables/render.ts` (nine renderers + the running
  zero-invention audit), `app/src/dashboard/metrics.ts` (risk scoring +
  exact reconciliation). The AI-ready JSON export is the ninth deliverable.
- **Shell** — `app/src/App.tsx` (hand-rolled screen switch, ~8 screens),
  `ErrorBoundary.tsx`, `ModelInspector.tsx`; `acceptance.test.ts` re-proves the
  Definition of Done end to end on every run.

The 10 entity types: facts, processes, relationships, decisions, judgments,
history, systems, commitments, risks, gaps. **Only the schema is frozen** —
changing `schema.ts` requires a logged decision and a version bump.

---

## 5. The non-negotiables (do not regress these)

1. **Never fabricate.** Owner answers are stored verbatim as facts. Inference
   is always labeled (source kind `inferred`, or clearly marked low-confidence
   / needs-verification). Deliverables render **only** from the model; empty
   sections say "Not yet captured."
2. **The zero-invention audit** (`auditRendered`) must keep passing — it fails
   the test suite if any rendered string isn't traceable to a model value. If
   you add a renderer, register every model string via `Doc.c()`.
3. **Never delete captured knowledge.** Merge, conflict resolution, and edits
   demote/modify attributably (bump `updatedAt`), never delete.
4. **Never store credentials.** The API key is memory-only (React state via a
   ref); it is never written to the project file or localStorage.
5. **No financial/legal/tax advice**, and the disclaimer stays on every screen
   and every deliverable.
6. **Governance:** work on a branch, log a decision in `DECISIONS.md`, update
   `STATE.md`, keep the suite green, and don't touch the frozen schema without
   a logged, versioned decision.

---

## 6. Roadmap — future expansions (rough priority)

**A. Land the pending work.** Review/merge the three branches (§3). For the
LLM adapter, the remaining step is real-world verification: `npm run dev`, open
"Assisted interviewing" on the home screen, paste an Anthropic key, run a short
interview, confirm the live structured extraction and question rewording work,
then merge. Recommended model `claude-haiku-4-5`.

**B. Finish structured capture.** On the capture branch, list-fields (a
process's steps, a decision's criteria) are add-only; `patchEntity` handles
string/boolean fields. Add inline editing for array fields to complete the
"edit everything" story.

**C. Wire LLM question generation into the UI.** `LlmInterviewEngine.nextQuestion`
already rewords the rule-chosen question, but the interview screen still shows
the deterministic text. Surface the reworded question (async, with a loading
state) once the live path is verified. Consider also using the model to draft
adaptive follow-ups (still never writing to the model except via the verbatim
floor + labeled inference).

**D. Role DNA schema sharing.** Extract `app/src/knowledge-model/` into a
standalone package both products import. It was built self-contained for
exactly this. Needs a decision on where the shared package lives and how
versioning is coordinated between the two products.

**E. Robustness & durability.**
- `newId` uses an 8-char random suffix — fine now, collision-prone at scale;
  consider a stronger id or a collision retry.
- Persistence is one localStorage key per project — no quota handling, no
  autosave conflict handling, export is manual. Consider autosave, a backup
  mechanism, and optional file-system persistence.
- `mergeModels()` is fully built and tested but **not wired into the app** — it
  is latent capability for the future cloud-sync path. Wire it when sync lands.

**F. Owner-facing polish.** Real PDF export (currently browser-print), an
owner "everything captured" summary beyond the developer inspector (the
Knowledge screen on the capture branch is the start), richer progress /
coverage visibility, and onboarding.

**G. Evidence gaps to close (process, not code).** Capture browser
screenshots for the visual stages; run an actual WCAG AA audit / screen-reader
pass (currently asserted, not tool-verified). A browser is available now.

**H. Deeper interview intelligence.** The rule-based engine is a fixed script
with pattern-matched follow-ups. The LLM adapter is the path to a genuinely
adaptive interviewer — expand it (thread-following, deeper extraction) once the
live path is proven, always inside the integrity rules.

---

## 7. First move for the next session

```
1. cd app && npm install && npm run build && npm test && npm run lint   # clean baseline
2. Read CLAUDE.md, MASTER-SPEC.md, STATE.md, DECISIONS.md.
3. Pick one item from §6, propose it as a logged decision, branch, build,
   keep the suite green, log the decision, update STATE.md, open a PR.
```

Nothing here is on fire. The product is complete for the offline workflow and
fully backed up. Expansion is additive — protect the frozen contract and the
integrity guarantees, and everything else is fair game.
