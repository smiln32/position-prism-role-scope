# ICM Conformance Log — successor-review-build

_Audited: 2026-07-16 · Standard: ICM (Van Clief & McDermott, arXiv:2603.16021) · Tree inspected: full repo tree to depth 2 excluding `.git/`, `app/node_modules/`, `app/dist/`; read all nine `00-control/` docs, all five folder READMEs, and root `README.md`._

## Conformance

| Area | Score | Headline |
|---|---|---|
| A. Root layers (0,1) | 4/4 | `CLAUDE.md` at root and nowhere else; root `CONTEXT.md` carries a real stage map + shared-resource routing |
| B. Stage folders & numbering | 2/4 | No `stages/` dir; numbered root folders are sequential and order-encoding, but hyphen-prefixed |
| C. Stage internals (CONTEXT/references/output) | 0/4 | Zero of nine folders have `CONTEXT.md`, `references/`, or `output/` |
| D. Stage contracts (Inputs/Process/Outputs) | 0/4 | No contract sections anywhere; READMEs are descriptive prose |
| E. Stage chaining | 1/4 | No declared handoffs; folders reference `app/src/`, not prior stage output |
| F. Layer discipline & hard rules | 2/4 | Plain-text/git/editable all pass; Layer 3/4 mixed; no `_config/shared/` |
| **Total** | **9/24** | **Weak** (was 6/24) |

Bands: 22–24 fully conformant · 17–21 mostly · 11–16 partial · 5–10 weak · 0–4 non-conformant.

## Framing (read before acting on the findings)

This workspace is **not a partially-built ICM workspace — it is a conventional
application repo** whose documentation folders happen to be numbered. The
numbered folders (`01-schema` … `08-docs`) mirror the *build stages* recorded in
`00-control/STATE.md`; they are **documentation about `app/`**, not stages an
agent flows through. The real pipeline is TypeScript under `app/src/`.

Three competing structures are in play:

1. **Paper ICM** (this audit's standard) — `stages/NN_name/{CONTEXT.md,references/,output/}`.
2. **The master prompt's `ICM_WORKSPACE`** (`Business Knowledge Succession Platform.md`) — an 18-folder tree, `00-control` … `17-commercialization`, with `project-memory.md`.
3. **What was actually built** — 9 folders, `00-control` … `08-docs`, with `DECISIONS.md` serving the `project-memory.md` role.

The findings below score against (1). Adopting (1) wholesale is **not
automatically the right call** — see Recommendation.

## Open findings

| ID | Sev | Area | Location (path) | Problem | ICM rule | Fix |
|----|-----|------|-----------------|---------|----------|-----|
| ICM-01 | Critical | B | `./` | No `stages/` dir; the nine numbered folders sit at root and hold docs, not stage I/O | Numbered stages | Create `stages/` and move stage folders under it |
| ICM-02 | Critical | D | all `*/README.md` | No stage declares Inputs / Process / Outputs; an agent cannot know what to read or write | Stage contract (Layer 2) | Add `CONTEXT.md` per stage with the three sections |
| ICM-03 | Critical | E | all numbered folders | No stage N reads stage N-1's `output/`; READMEs point at `app/src/*` instead | Stage chaining | Declare explicit path handoffs in each `CONTEXT.md` |
| ICM-04 | High | C | all numbered folders | None of the nine has `CONTEXT.md`, `references/`, or `output/` | Layers 2/3/4 | Scaffold all three per stage |
| ICM-07 | High | F | `01-schema/` | Layer 3/4 mixed: stable contract (`README.md`) sits beside generated per-run artifacts (`fixture-empty.model.json`, `fixture-hartwell.model.json`) | references/ stable vs output/ per-run | Split into `references/` + `output/` |
| ICM-08 | High | F | `07-testing/` | Layer 3/4 mixed: test source (`acceptance.test.ts`) sits beside generated artifacts (`stage6-package/`, five `stage*-acceptance*.md` reports) | references/ stable vs output/ per-run | Split into `references/` + `output/` |
| ICM-10 | Medium | F | `./` | No `_config/shared/` for shared resources | Configure once, run repeatedly | Create `_config/shared/` if shared config emerges |
| ICM-11 | Low | B | `00-control` … `08-docs` | Hyphen prefixes (`01-schema`); ICM examples use underscores (`01_schema`) | Decimal prefixes | Cosmetic; rename only if converting |

## What is already ICM-correct (preserve)

- **Plain-text interface** — every interface file is markdown or JSON. No binaries, no DB coupling. Fully satisfies the hard rule.
- **Git-compatible / diffable** — clean git repo; every prompt and output is plain text, diffable, reversible.
- **Every output is editable** — all artifacts are human-openable text.
- **Sequential numbering** — `00`–`08` with no gaps or duplicates, and names encode execution order.
- **One stage, one job** — each numbered folder holds a single coherent domain; no folder bundles distinct jobs.
- **Project memory** — `00-control/DECISIONS.md` (30 KB, actively maintained) already does what ICM's Layer 0/1 memory intends, and what the master prompt called `project-memory.md`.

## Recommendation

**Do not auto-convert.** The 6/24 reflects that this repo was never built to the
paper's ICM structure — not that it is broken. Converting would rewrite every
cross-reference in `DECISIONS.md`, `STATE.md`, `HANDOFF*.md`, and `NEXT-STEPS.md`
(`DECISIONS.md` alone is referenced by 23 files) and would break the documented
resume path (`STATE.md:125`) that a fresh session depends on — against a build
that is complete and green at 106 tests.

Cheap, non-breaking, real wins (ICM-05, ICM-06, ICM-09) can be taken without
restructuring: add a root `CONTEXT.md` stage map, mirror `CLAUDE.md` to root,
and resolve the empty `06-export/`. Full conversion should be an owner decision
logged in `DECISIONS.md`, and should first settle **which** ICM is the target —
the paper's, or the master prompt's 18-folder `ICM_WORKSPACE`.

## Resolved

| ID | Sev | Location | What it was | Fixed on |
|----|-----|----------|-------------|----------|
| ICM-05 | High | `CONTEXT.md` | No root Layer 1 router. Now present: stage map pairing each numbered folder with its `app/src/` source, shared-resource routing, and the folder-number ≠ build-stage-number caveat | 2026-07-16 |
| ICM-06 | High | `CLAUDE.md` | Layer 0 was nested at `00-control/CLAUDE.md`. Moved to root **and nowhere else** (owner directive) via `git mv`, history preserved as a rename. Spec amended (`MASTER-SPEC.md:125`) and logged in `DECISIONS.md` per rule 5; all path-bearing references updated | 2026-07-16 |
| ICM-09 | Medium | `06-export/README.md` | Folder was empty since Stage 0. **Re-diagnosed:** not a dead slot — the domain is specified at `MASTER-SPEC.md:131` and the functionality shipped in Stages 2/4/6; only the doc was missing. Now documents all three exports (project round-trip, sealed, AI-ready) | 2026-07-16 |

## History

- 2026-07-16: first ICM audit — 11 findings, 6/24 (weak). No restructuring performed.
- 2026-07-16: ICM-05, ICM-06, ICM-09 fixed (owner-directed) — 9/24. Root layers now 4/4. Remaining findings all require the `stages/` conversion that was declined pending an owner decision on which ICM is the target; `06-export` was re-diagnosed as a documentation gap, not a dead slot.
