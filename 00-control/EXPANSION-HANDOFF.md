# EXPANSION HANDOFF - Successor

Written 2026-07-11. **Refreshed 2026-07-16** — the original had gone stale
enough to be actively misleading (it listed merged branches as pending and told
you to fix things already fixed). This document orients a future session (human
or AI) that picks up **expansion** work after the staged build (Stages 0-8) was
completed and the project moved into GitHub. It complements — and for new work,
supersedes — the older `HANDOFF.md`, which covered the one-time move from the
chat environment into Claude Code.

Read `CLAUDE.md` (repo root) and `CONTEXT.md` (repo root) first, then this,
`MASTER-SPEC.md`, `STATE.md`, and `DECISIONS.md` before writing code. The frozen
contract and the knowledge-integrity rules are non-negotiable; everything below
assumes you will honor them.

> **Before picking anything from §6:** read `PATH-TO-SHIP.md`. The product is a
> complete local prototype that **is not shipped** — not hosted, no distribution.
> Three owner decisions gate that work (hosted site vs. desktop app; free vs.
> paid v1; adapter #3 in or out), and the distribution choice drives most of it.
> Expanding scope before shipping v1 is the failure mode this project's
> governance exists to prevent.

---

## 1. What this project is (in one paragraph)

**Successor** captures a business owner's operating knowledge through
structured interviews and document analysis and renders it into a
succession package (nine deliverables). The knowledge model **is** the
product; every deliverable is a view of it and never invents content. It is
explicitly *not* financial/legal/tax advice. React 19 + TypeScript + Vite,
local-first (localStorage), no runtime dependencies beyond React. Sister
product to "Role DNA"; the schema is designed to be shared with it — see §6D,
the single most architected expansion path in this repo.

---

## 2. Where everything lives

- **Repo:** `github.com/smiln32/successor` (PRIVATE, owner `smiln32`, default
  branch `master`).
- **Local working copy:** `C:\Users\smiln\Downloads\apps\successor-review-build`
  (still under `Downloads`; consider a permanent location).
- **App:** `app/` — the runnable application.
- **Repo root:** `CLAUDE.md` (operating rules — root only since 2026-07-16),
  `CONTEXT.md` (task routing / stage map), `README.md`, `ICM-AUDIT-LOG.md`.
- **Workspace/control folders:** `00-control/` (spec, state, decisions,
  handoffs, ship plan) and `01-schema/` … `08-docs/` (design artifacts,
  contracts, prompts, test evidence, docs). These hold artifacts, not compiled
  source. `CONTEXT.md` maps each to its `app/src/` counterpart.

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
npm test          # vitest run  → expect 106 passing
npm run lint      # oxlint
npm run dev       # local dev server for manual/browser work
```
Never build on a broken baseline. If build/test/lint aren't clean, stop and
fix before adding anything.

---

## 3. Branch / PR state (as of 2026-07-16)

**`master` is green: 106 tests, clean build, clean lint.** It contains
everything below except the LLM adapter. Nothing is on fire.

| PR | Branch | Status | What it added |
|----|--------|--------|---------------|
| #1 | `maintenance/merge-report-timestamp-fix` | **Merged** | Merge report counts content changes only, not timestamp bumps |
| #2 | `feature/structured-knowledge-capture` | **Merged** | Direct structured capture + Knowledge screen + the jsdom component-test harness |
| #3 | `feature/llm-interview-adapter` | **OPEN — DRAFT** | Optional Anthropic (Haiku) interview adapter. Engine unit-tested; **live network + async UI path NOT browser-verified.** Blocked on your API key — see §6A |
| #4 | `feature/data-at-rest-encryption` | **Merged** | Passphrase protection (WebCrypto PBKDF2 250k / AES-GCM) behind the `StorageLike` seam; passphrase memory-only |
| #5 | `feature/list-field-editing` | **Merged** | Array fields editable item-by-item — completed the "edit everything" story |
| #6 | `feature/storage-durability` | **Merged** | Collision-proof `newId` (full UUID), one-deep backup slot with corrupt-primary recovery, quota-aware save errors |
| #7 | `perf/code-split-screens` | **Merged** | Route-level code splitting; initial JS 87.2 → 69.0 KB gzip (~21%) |
| #8 | `docs/session-handoff-2026-07-13` | **OPEN — stale** | Superseded handoff snapshot. Close or merge as docs; owner's call |
| #9 | `fix/scroll-to-top-on-navigation` | **Merged** | Every view opens at the top |
| #10 | `docs/readme-and-env-gitignore` | **Merged** | Top-level README; `.env` ignored in both gitignores |
| #11 | `docs/handoff-and-ship-plan-2026-07-15` | **Merged** | `HANDOFF-2026-07-15.md` + `PATH-TO-SHIP.md` |

> On the #4/#6 interaction: the vault also seals #6's `successor:project-backup:`
> keys (`isManagedKey` = project OR backup prefix), so backups are ciphertext at
> rest and still recoverable. See DECISIONS 2026-07-13 "Gate / Integration".

---

## 4. Architecture (module map)

Data flows: **capture → the knowledge model → views.**

- **Capture** — `app/src/interview/` (rule-based `RuleBasedEngine` in
  `engine.ts`, **8 tracks / 50 areas**; verbatim facts, name-gaps, single-person
  risks; the optional `LlmInterviewEngine` in `llm.ts` on branch #3 only) and
  `app/src/analysis/extract.ts` (document line extraction + conflict detection).
  Plus **direct structured capture** in `app/src/knowledge-model/capture.ts`.
- **The knowledge model (core)** — `app/src/knowledge-model/`: `schema.ts`
  (frozen v1.0.0, 10 entity types), `model.ts` (validate / export / import),
  `merge.ts` (merge never deletes; dedupe only flags), `capture.ts`.
  `app/src/project/store.ts` wraps it as the saved project file and handles
  sessions + migration; `vault.ts` adds encryption behind the `StorageLike` seam.
- **Views** — `app/src/deliverables/render.ts` (nine renderers + the running
  zero-invention audit), `app/src/dashboard/metrics.ts` (risk scoring + exact
  reconciliation). The AI-ready JSON export is the ninth deliverable.
- **Shell** — `app/src/App.tsx` (hand-rolled screen switch, ~9 screens, six
  lazy-loaded), `ErrorBoundary.tsx`, `ModelInspector.tsx`; `acceptance.test.ts`
  re-proves the Definition of Done end to end on every run.

The 10 entity types: facts, processes, relationships, decisions, judgments,
history, systems, commitments, risks, gaps. **Only the schema is frozen** —
changing `schema.ts` requires a logged decision and a version bump.

**The frozen schema is why cheap expansion is cheap.** New tracks are data in
`TRACKS`; new deliverables are a renderer plus `Doc.c()` registration; richer
inputs fold into the same 10 types. The useful test for any proposal: *does it
fold into the frozen model, or does it need a new entity type?* The second
answer costs an order of magnitude more.

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
   ref); it is never written to the project file or localStorage. Same rule for
   the vault passphrase.
5. **No financial/legal/tax advice**, and the disclaimer stays on every screen
   and every deliverable.
6. **Governance:** work on a branch, log a decision in `DECISIONS.md`, update
   `STATE.md`, keep the suite green, and don't touch the frozen schema without
   a logged, versioned decision.

---

## 6. Roadmap — future expansions (rough priority)

Items marked **DONE** are kept for continuity — the original roadmap sent a
later session to redo them. Do not rebuild them.

**A. Finish the LLM adapter (PR #3) — needs YOU for one step.** The blocker is
verification, not code. `git checkout feature/llm-interview-adapter`,
`npm install && npm run dev`, open **"Assisted interviewing"** on the home
screen, paste a real Anthropic key (recommended model `claude-haiku-4-5`), run a
short interview, and confirm (a) live structured extraction lands in the model,
(b) question rewording works, (c) errors/timeouts degrade gracefully to the
rule-based engine. Then mark #3 ready and merge, and log the result in
`DECISIONS.md`. Expect a small additive `App.tsx` reconciliation. *Claude cannot
do the key step.* Alternatively, cut #3 from v1 — that is one of the three
`PATH-TO-SHIP.md` decisions.

**B. Finish structured capture — DONE (PR #5, 2026-07-13).** Array fields are
editable item-by-item via `addListItem`/`editListItem`/`removeListItem`. Steps
renumber 1..n; removal is owner-directed item correction, the only removal.

**C. Wire LLM question generation into the UI.** `LlmInterviewEngine.nextQuestion`
already rewords the rule-chosen question, but the interview screen still shows
the deterministic text. Surface the reworded question (async, loading state).
**Only after A is verified** — it depends on the live path working.

**D. Role DNA schema sharing.** Extract `app/src/knowledge-model/` into a
standalone package both products import. It was built self-contained for exactly
this, and `schema.ts`'s `subjectRole` field is the deliberate compatibility seam
(`"owner"` for Successor, other roles for Role DNA — see `01-schema/README.md`).
This is the highest-leverage expansion in the repo: same model, same engine, same
renderers, different subject. Needs a decision on where the shared package lives
and how versioning is coordinated between the two products.

**E. Robustness & durability — LARGELY DONE (PR #6, 2026-07-13).**
- ~~`newId` 8-char suffix collision risk~~ — **fixed**, full 122-bit UUID.
- ~~No quota handling, no backup~~ — **fixed**: one-deep backup slot,
  corrupt-primary recovery, quota-aware save errors. Sealed at rest via #4.
- **Still open:** `mergeModels()` remains built, tested, and intentionally
  **unwired** — wire it only when a real cloud-sync path lands, never
  speculatively (that is build-ahead). Optional file-system persistence is also
  still open, and is effectively the same question as "desktop app?" in
  `PATH-TO-SHIP.md` decision #1.
- **Note:** durability is still the #1 pre-ship risk. Backup/recovery exists,
  but knowledge lives in `localStorage` and a cleared browser is still the
  scenario to design against. See `PATH-TO-SHIP.md` Tier 1.

**F. Owner-facing polish.** Real PDF export (currently browser-print), richer
progress/coverage visibility, and onboarding/first-run. See `PATH-TO-SHIP.md`
Tier 2. (The owner-facing "everything captured" view landed as the Knowledge
screen in PR #2.)

**G. Evidence gaps to close (process, not code).** Browser screenshots for the
visual stages; a real WCAG AA audit / screen-reader pass — currently asserted,
not tool-verified. A browser is available now. `PATH-TO-SHIP.md` Tier 1 also
wants real-browser testing: the suite runs in jsdom, not real Chrome/Safari.

**H. Deeper interview intelligence.** The rule-based engine is a fixed script
with pattern-matched follow-ups. The LLM adapter is the path to a genuinely
adaptive interviewer — expand it (thread-following, deeper extraction) once the
live path is proven, always inside the integrity rules.

**I. Richer inputs (added 2026-07-15).** Direction decided, nothing built:
**local-first**, build order **PDF text → in-browser OCR → audio → video**, all
folding into the frozen model. Any cloud processing is strictly opt-in with the
owner's own key, never stored. See DECISIONS 2026-07-15 and `PATH-TO-SHIP.md`
Tier 4. Note this is the one roadmap item with a genuine staged-pipeline shape,
where a human-editable intermediate between "the machine read this" and "this is
now business knowledge" is what keeps non-negotiable #1 intact once inputs stop
being typed by a person.

---

## 7. First move for the next session

```
1. cd app && npm install && npm run build && npm test && npm run lint   # clean baseline
2. Read CLAUDE.md + CONTEXT.md (repo root), then STATE.md, DECISIONS.md,
   NEXT-STEPS.md, PATH-TO-SHIP.md.
3. Pick one item from §6, propose it as a logged decision, branch, build,
   keep the suite green, log the decision, update STATE.md, open a PR.
```

Nothing here is on fire. The product is complete for the offline workflow and
fully backed up. Expansion is additive — protect the frozen contract and the
integrity guarantees, and everything else is fair game. But **shipping beats
expanding**: see `PATH-TO-SHIP.md` before you start something new.
