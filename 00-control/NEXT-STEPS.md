# NEXT STEPS — where to pick up

_Last updated: 2026-07-13. This is the short, current "where do I start" note.
For the fuller roadmap and architecture, read `EXPANSION-HANDOFF.md` (§4 map,
§5 non-negotiables, §6 full roadmap A–H). Read `CLAUDE.md` before writing code._

---

## 1. Current state (as of 2026-07-12)

The staged build (Stages 0–8) is complete and approved on `master`. Since then,
two expansion PRs have **merged to master** and one is **still open as a draft**.

| PR | Branch | Status | Notes |
|----|--------|--------|-------|
| #1 | `maintenance/merge-report-timestamp-fix` | **Merged** ✅ | Merge report counts content changes only, not timestamp bumps |
| #2 | `feature/structured-knowledge-capture` | **Merged** ✅ | Direct structured capture + owner-facing Knowledge screen + jsdom component tests. Brought dev-deps `jsdom` + `@testing-library/*` to master. A small doc-file conflict (DECISIONS/STATE) was resolved by keeping both sides. |
| #3 | `feature/llm-interview-adapter` | **Open — DRAFT** ⏸️ | Optional Anthropic (Haiku) interview adapter. Engine logic unit-tested; **the live network + async UI path is NOT browser-verified.** Do not merge until it is (see item 3B below). |
| #4 | `feature/data-at-rest-encryption` | **Open — PR** 🔐 | Passphrase protection for localStorage (roadmap item B). Behind the StorageLike seam; frozen schema untouched; passphrase memory-only. 90 tests, clean build+lint. Verified via jsdom + real WebCrypto; an optional real-browser spot-check is the one thing not yet done. |

**Merged code is green:** 74 tests pass, clean build, clean lint.

`master` now contains everything except the LLM adapter. Nothing is on fire.

---

## 2. First move for any new session

```
$env:Path = "C:\Program Files\nodejs;" + $env:Path   # PowerShell: node/npm not on PATH here
cd app
npm install
npm run build     # tsc -b && vite build
npm test          # vitest run  → expect 74 passing
npm run lint      # oxlint
```
If the baseline isn't clean, **stop and fix before adding anything.** Never
build on a broken baseline.

`gh` (GitHub CLI) is at `C:\Program Files\GitHub CLI\gh.exe`, authed as `smiln32`.

---

## 3. Prioritized next actions

Pick one, propose it as a logged decision in `DECISIONS.md`, branch off master,
build, keep the suite green, update `STATE.md`, open a PR. Governance in
`CLAUDE.md` and `EXPANSION-HANDOFF.md §5` is non-negotiable (never fabricate,
labeled inference only, never delete captured knowledge, no stored credentials,
zero-invention audit must keep passing, don't touch the frozen schema without a
versioned decision).

### A. Finish the LLM adapter (PR #3) — needs YOU for one step
The blocker is verification, not code. The engine is written and unit-tested;
the live path has never run against a real key.
1. `git checkout feature/llm-interview-adapter`, then `npm install && npm run dev`.
2. In the browser, open **"Assisted interviewing"** on the home screen.
3. Paste a real Anthropic key (recommended model `claude-haiku-4-5`). The key is
   memory-only — it is never written to disk. It goes to `api.anthropic.com`
   directly from the browser.
4. Run a short interview. Confirm: (a) live structured extraction lands in the
   model, (b) question rewording works, (c) errors/timeouts degrade gracefully
   to the rule-based engine.
5. If good: mark PR #3 **ready** and merge. Expect a small additive `App.tsx`
   reconciliation (both #2 and #3 touched nav wiring).
6. Log the verification result in `DECISIONS.md`.

> Note: I (Claude) cannot do step 3 — it needs your API key. Everything else I can.

### B. Data-at-rest encryption — ✅ DONE in PR #4 (`feature/data-at-rest-encryption`)
Built 2026-07-13 exactly as proposed below; see `DECISIONS.md` 2026-07-13 and
`08-docs/SECURITY.md`. Remaining before merge: review, and (optional) a real
browser spot-check on top of the jsdom + real-WebCrypto coverage. The original
proposal, for reference:

A 2026-07-12 security look found the one real exposure: **the knowledge model is
stored in `localStorage` as plaintext.** Anyone with access to the machine or
browser profile can read the whole thing via devtools. Everything else is sound
(local-only, no telemetry, no `innerHTML`/XSS surface, minimal deps, no stored
credentials).

Proposed, self-contained fix:
- Passphrase-derived key (WebCrypto `PBKDF2`/`AES-GCM`, no new dependencies),
  encrypt the project JSON before `storage.setItem`, decrypt on load.
- The passphrase is memory-only, same rule as the API key — never stored.
- Unlock screen on app open; export stays plaintext (owner's explicit action).
- Touches `app/src/project/store.ts` (the `StorageLike` seam makes this clean)
  and the App shell. Frozen schema untouched.
- This is the highest-value hardening item for a product holding private info.

### C. Finish structured capture (roadmap item B)
On the (now merged) capture code, list-fields — a process's `steps`, a
decision's `criteria` — are **add-only**. `patchEntity` handles string/boolean
fields but not array editing/removal.
- Add inline editing + removal for array fields in `KnowledgeScreen.tsx` and
  extend `capture.ts` accordingly (never delete silently — same attributable
  edit semantics, bump `updatedAt`).
- Cover it with the jsdom component-test harness that PR #2 introduced.

### D. Wire LLM question generation into the UI (roadmap item C)
`LlmInterviewEngine.nextQuestion` already rewords the rule-chosen question, but
the interview screen still shows the deterministic text. Surface the reworded
question (async, loading state). **Do this only after item A is verified** — it
depends on the live path working.

### E. Further out (see `EXPANSION-HANDOFF.md §6 D–H)
Role DNA schema sharing (extract `knowledge-model/` into a shared package),
robustness (stronger ids, autosave/backup, wire the built-but-unused
`mergeModels()` for cloud sync), real PDF export, and the process-level evidence
gaps (browser screenshots, a real WCAG audit).

---

## 4. Map of the important files

- `00-control/` — `CLAUDE.md` (rules), `MASTER-SPEC.md`, `STATE.md` (live
  inventory), `DECISIONS.md` (append-only log), `EXPANSION-HANDOFF.md` (full
  roadmap), this file.
- `app/src/knowledge-model/` — `schema.ts` (**frozen v1.0.0**, 10 entity types),
  `model.ts` (validate/export/import), `merge.ts`, `capture.ts` (direct entry).
- `app/src/interview/` — `engine.ts` (rule-based, 8 tracks/50 areas),
  `llm.ts` (adapter, on branch #3 only), `InterviewScreen.tsx`.
- `app/src/analysis/extract.ts` — document extraction + conflict detection.
- `app/src/deliverables/render.ts` — nine renderers + the zero-invention audit.
- `app/src/dashboard/metrics.ts` — risk scoring + exact reconciliation.
- `app/src/project/store.ts` — project file + sessions + the `StorageLike` seam.
- `app/src/App.tsx` — hand-rolled screen switch (~9 screens).
