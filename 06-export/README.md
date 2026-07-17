# Export & Import — project portability and AI-ready export

_Spec: `00-control/MASTER-SPEC.md:131` ("06-export/ — AI export, project
export/import"). Written 2026-07-16; the folder was specified in Stage 0 but
never documented while the functionality shipped._

**Which stage built this:** no single one. Model JSON export/import came with
the frozen contract in **Stage 1** (`MASTER-SPEC.md:149-150`); project
save/load/resume/export in **Stage 2** (`:154-155`); the AI-ready export
renderer as the ninth deliverable in **Stage 6**. The spec assigned AI export to
**Stage 7** (`:178-180`); as built it landed in Stage 6, and Stage 7 contributed
the export-validates-against-schema evidence (`07-testing/stage7-acceptance.md`).
Sealed export arrived later still, with PR #4 (2026-07-13).

Sources:
- `app/src/project/store.ts` — project file format, export/import
- `app/src/project/vault.ts` — sealed (encrypted) export
- `app/src/deliverables/render.ts` — the AI-ready export deliverable
- `app/src/knowledge-model/model.ts` — `exportModel` / `importModel`

There are **three distinct exports**. They serve different jobs and are easy to
confuse.

## 1. Project export/import (round-trip, lossless)

`ProjectStore.exportJson(projectId): string` (`store.ts:202`) and
`ProjectStore.importJson(json): ProjectFile` (`store.ts:206`).

The whole project file — `{ formatVersion, model, sessions[], documents?, … }` —
as JSON. This is the **backup and move-between-computers** path, and the only
one that round-trips: what `exportJson` writes, `importJson` reads back to a
byte-identical project.

- `PROJECT_FORMAT_VERSION = '1.0.0'` (`store.ts:10`).
- Import **validates before accepting** — `validateProjectFile` (`store.ts:98`)
  returns structured errors; invalid input is refused, never partially applied.
- Older files migrate forward on load via `migrateProject` (`store.ts:53`);
  legacy Stage 3 session state auto-migrates.
- In the app: "Export project" on the project screen, "Restore from file" on
  Home.

Acceptance evidence: `07-testing/` — create → destroy all in-memory state →
resume from storage → byte-identical export (`app/src/project/store.test.ts`).

## 2. Sealed export — a lockout safety net, not a sharing feature

`EncryptedStorage.exportSealed(backing): string` (`vault.ts:224`).

**Purpose (from the source docstring, `vault.ts:218-223`): it lets a
locked-out owner preserve their ciphertext before resetting, so that a reset
never destroys data — integrity rule 9, "never delete captured knowledge."**
Readable later only with the original passphrase. It is a safety net for the
forgot-my-passphrase path, *not* a way to share a project with someone who
should hold the file but not the contents.

Mechanics:
- Emits entries **still encrypted** — AES-GCM 256-bit, key stretched from the
  passphrase with PBKDF2/SHA-256 at `KDF_ITERATIONS = 250_000` (`crypto.ts:18-21`).
  The work factor is recorded in each vault marker so it can evolve.
- Takes **no `projectId`** — it sweeps *every* managed key via `projectKeys` →
  `isManagedKey` (`vault.ts:40-41,69-75`), i.e. all projects **and** their
  `successor:project-backup:` durability slots. This is a whole-vault dump, not
  a per-project export.
- Output shape: `{ kind: 'successor-sealed-vault', marker, entries }`.

**The passphrase is memory-only and never exported** (operating rule 11 / rule 4
in `08-docs/SECURITY.md`). A sealed file without its passphrase is
unrecoverable — which is the design, since the whole point is preserving
ciphertext the owner can still unlock later with the passphrase they had.

## 3. AI-ready knowledge export (read-only deliverable)

`aiExport` (`render.ts:268`), registered as the ninth deliverable:
`{ id: 'ai-export', title: 'AI-Ready Knowledge Export' }` (`render.ts:288`).

The knowledge model as structured JSON inside a markdown fence, for future AI
enablement — feeding the captured knowledge to a downstream model. Rendered
through `exportModel(project.model)`, so it is the same lossless format as (1),
presented for reading rather than for re-import.

Like every deliverable it renders **exclusively from the knowledge model** and
registers through `Doc.c()`, so `auditRendered()` proves zero invention
(operating rule 12). Generated sample:
`07-testing/stage6-package/ai-export.md`.

## Which one do I want?

| Goal | Use |
|---|---|
| Back up / move a project between computers | (1) project export |
| Locked out of the vault and about to reset — save the data first | (2) sealed export |
| Feed captured knowledge to another AI tool | (3) AI-ready export |
| Read the model as a human | Model JSON download (Deliverables screen) |

Note there is **no supported "hand someone the file but not the contents"
export.** Sealed export looks like one and is not: it is whole-vault and exists
for the reset path. If that sharing case is ever wanted, it needs a real
decision, not a repurposing of (2).

## Constraints

- Export never includes credentials — the model never holds them (rule 11); it
  records only *where* credentials live and *who* has access.
- Export is not a substitute for durable storage. Knowledge lives in browser
  `localStorage`; data durability is the #1 pre-ship risk in
  `00-control/PATH-TO-SHIP.md` (Tier 1). Backup/recovery exists (PR #6) and the
  vault seals backups too, but **prompting the owner to export is still the
  only thing standing between them and a cleared browser.**
- `mergeModels()` is intentionally **not** wired to import (deferred to a real
  sync path; see `00-control/STATE.md`). Import replaces; it does not merge.
