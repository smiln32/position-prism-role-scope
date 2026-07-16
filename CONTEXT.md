# CONTEXT.md — Task Routing (Layer 1)

_Successor — business knowledge succession platform. This file is the map: it
tells a new session (human or AI) **where to go for what**. It routes; it does
not duplicate. Every folder's own README remains the authority on its domain._

**Read first:** `CLAUDE.md` (operating rules — Layer 0, repo root, and **nowhere
else**) before writing any code. Then `00-control/STATE.md` (where the build
stands) and `00-control/HANDOFF-2026-07-15.md` (latest session snapshot).

---

## What this workspace is

An **application repo**, not a staged agent pipeline. The executable product
lives in `app/` (React + TypeScript, Vite). The nine numbered folders are
**documentation domains** that describe and evidence that app — each pairs with
a source directory under `app/src/`. Nothing "flows" folder-to-folder at
runtime; the pairing below is the real routing.

The folder set is fixed by `00-control/MASTER-SPEC.md:123-133` (Stage 0
workspace definition) and matches it exactly.

> **Numbering caveat:** folder numbers are **domains, not build-stage numbers**,
> and the two do not line up. `05-deliverables` was built in Stage 6;
> `04-model-views` in Stage 7; `06-export` and `08-docs` each span several
> stages. Trust `MASTER-SPEC.md:143-186` and `STATE.md` for build order — never
> the folder prefix.

## Stage map

Every "built in" below is sourced from `MASTER-SPEC.md`'s staged build plan
(lines 143–186) cross-checked against `STATE.md` and each folder's own README —
not inferred from the folder number.

| Folder | Domain | Paired source | Built in |
|---|---|---|---|
| [`00-control/`](00-control/) | Governance: spec, decisions, state, handoffs | — | Stage 0, maintained throughout |
| [`01-schema/`](01-schema/) | Knowledge model contract v1.0.0 (**FROZEN**) + fixtures | `app/src/knowledge-model/` | Stage 1 |
| [`02-interview/`](02-interview/) | Interview engine: 8 tracks, **50 areas**, adaptive logic | `app/src/interview/` | Stage 3 (Track 1) → Stage 4 (all eight) |
| [`03-analysis/`](03-analysis/) | Document extraction, conflict detection, resolution | `app/src/analysis/` | Stage 5 |
| [`04-model-views/`](04-model-views/) | Dashboard, risk scoring formula, gap views | `app/src/dashboard/` | Stage 7 |
| [`05-deliverables/`](05-deliverables/) | The nine renderers + zero-invention audit | `app/src/deliverables/` | Stage 6 |
| [`06-export/`](06-export/) | Project export/import, sealed export, AI-ready export | `app/src/project/` + `render.ts` `aiExport` | **Spans 1, 2, 6** — see note |
| [`07-testing/`](07-testing/) | Acceptance evidence + the acceptance test | `app/src/*.test.ts(x)` | Stages 3–8 (one file per gate) |
| [`08-docs/`](08-docs/) | User-facing: help, disclaimer, security, visual system | — | **Spans 2, 8, post-build** — see note |

**`06-export` spans three stages**, which is why no single number fits: model
JSON export/import came with the frozen contract in **Stage 1**
(`MASTER-SPEC.md:149-150`); project save/load/resume/export in **Stage 2**
(`:154-155`); the AI-ready export renderer shipped as the ninth deliverable in
**Stage 6** (`STATE.md`, "nine renderers"). Note the spec assigned AI export to
**Stage 7** (`:178-180`) — as built it landed in Stage 6, with Stage 7
contributing the export-validates-against-schema evidence
(`07-testing/stage7-acceptance.md`). Spec-vs-built drift, harmless, recorded
here rather than silently smoothed over.

**`08-docs` spans two stages plus post-build work:** `VISUAL-SYSTEM.md` was
established in **Stage 2** (its own line 1; spec `:154`), `HELP.md` and
`DISCLAIMER.md` in **Stage 8**, and `SECURITY.md` was added **2026-07-13** with
the data-at-rest encryption feature (PR #4), after the staged build closed.

**`06-export/` is empty.** The domain is specified in `MASTER-SPEC.md:131` and
the functionality **shipped** — export/import lives in `app/src/project/store.ts`,
sealed export in `vault.ts`, and the AI export renderer in
`app/src/deliverables/render.ts` (sample: `07-testing/stage6-package/ai-export.md`).
Only the folder's documentation was never written. It is a documentation gap,
not a missing feature. Tracked as ICM-09 in `ICM-AUDIT-LOG.md`.

## Shared resources

| Need | Go to |
|---|---|
| Operating rules / non-negotiables | `CLAUDE.md` (root) |
| Product spec (source of truth) | `00-control/MASTER-SPEC.md` |
| **Project memory** — why anything is the way it is | `00-control/DECISIONS.md` |
| Current build state | `00-control/STATE.md` |
| Latest session snapshot | `00-control/HANDOFF-2026-07-15.md` |
| What to pick up next | `00-control/NEXT-STEPS.md` |
| Roadmap + non-negotiables (long form) | `00-control/EXPANSION-HANDOFF.md` |
| Prototype → shippable product plan | `00-control/PATH-TO-SHIP.md` |
| Newcomer orientation | `README.md` |
| ICM structural conformance | `ICM-AUDIT-LOG.md` |
| Model fixtures | `01-schema/fixture-*.model.json` |
| Generated deliverable package | `07-testing/stage6-package/` |

`DECISIONS.md` is the highest-traffic document in the repo (referenced by 23
files). Any non-obvious change gets an entry there.

## Run it

```
$env:Path = "C:\Program Files\nodejs;" + $env:Path   # node/npm not on PATH here
cd app && npm install && npm run build && npm test    # expect 106 passing
npm run lint
```

Never build on a broken baseline. If the suite is not green, fix that first.

## Non-negotiables

Never fabricate; labeled inference only; never delete captured knowledge
(owner-directed, attributable edits only); no stored credentials (passphrase and
API key are memory-only); disclaimer on every screen and deliverable; the
zero-invention audit (`auditRendered`) must keep passing; **do not touch the
frozen `app/src/knowledge-model/schema.ts`** without a versioned, logged decision.

---

_Layer 1 of the ICM five-layer hierarchy (Van Clief & McDermott, arXiv:2603.16021).
This workspace is **not** a paper-conformant ICM `stages/` tree and does not claim
to be — see `ICM-AUDIT-LOG.md` (6/24) for the gap and the reasoning for leaving
it alone. This file supplies the routing an agent actually needs today._
