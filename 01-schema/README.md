# Successor Knowledge Model Contract - v1.0.0

FROZEN AT STAGE 1. Any change after the Stage 1 gate requires a logged
entry in 00-control/DECISIONS.md and a schemaVersion bump.

Source of truth (TypeScript): app/src/knowledge-model/
- schema.ts - all types
- model.ts - creation, validation, JSON export/import
- merge.ts - merge and duplicate detection
- fixture.ts - fictional test business (Hartwell Machine & Tool)
- knowledge-model.test.ts - 18 unit tests

Fixtures in this folder (generated through the real export path):
- fixture-empty.model.json
- fixture-hartwell.model.json

## The model

KnowledgeModel
- schemaVersion: "1.0.0"
- projectId: string
- subjectRole: string - "owner" for Successor; other roles for Role DNA
  (this field is the compatibility seam between the two products)
- profile: businessName, ownerName, industry?, employeeCount?, plannedExitWindow?
- createdAt / updatedAt: ISO 8601
- entities: ten collections, below

## Shared entity fields (EntityBase)

Every entity carries:
- id: string, unique across the whole model
- type: matches its collection (enforced by validation)
- confidence: high | medium | low
- sources: SourceRef[] - at least one, always
- createdAt / updatedAt: ISO 8601
- verified: boolean - true only when the owner has confirmed the item

SourceRef: { kind: interview | document | inferred, sessionId?, documentId?,
detail?, capturedAt }

## The ten entities

| Collection | Type | Key fields |
|---|---|---|
| facts | fact | statement, topic? |
| processes | process | name, purpose, frequency, steps[], dependencies[], failurePoints[], whoElseKnows[] |
| relationships | relationship | who, category (customer/vendor/banker/landlord/employee/advisor/other), whyTheyMatter, history, whatTheyExpect, transferRisk (high/medium/low), transferPlanStatus (not-started/planned/in-progress/transferred/will-not-transfer) |
| decisions | decision | name, howDecided, realCriteria[], thresholds[], examples[] (situation, whatWasDecided, outcome?) |
| judgments | judgment | heuristic, context? |
| history | history | whatHappened, when, whatWasLearned |
| systems | system | name, kind, whatItDoes, accessHeldBy (NEVER credentials), quirks[] |
| commitments | commitment | withWhom, whatWasPromised, direction, writtenDown |
| risks | risk | description, impact, riskKind, mitigation? |
| gaps | gap | question, raisedBecause, status (open/queued/resolved), relatedIds[] |

## Topic conventions (note added at build review)

Two fact.topic conventions coexist by design: interview-captured facts use
"track-N:areaId" (Stage 4 convention); document-captured facts use
"document:docId"; free-text topics (as in the Stage 1 fixture) are also
valid. The Successor's Handbook renders all three - track topics under
their questions, document facts under their own section, and anything else
under "Other knowledge on record" - so no captured fact can fall through.

## Validation rules

- schemaVersion must equal 1.0.0
- profile requires businessName and ownerName
- every entity: valid confidence, at least one source with valid kind and
  capturedAt, timestamps present, verified present
- entity type must match its collection
- ids unique across the entire model

## Merge semantics (rule 9: nothing silent)

- Merge never deletes. Base-only entities always survive.
- New ids are added.
- On id collision: the newer updatedAt contributes non-empty fields only;
  empty incoming fields never blank existing data. Sources are unioned.
  verified stays true if either side was true. createdAt keeps the earliest,
  updatedAt keeps the latest.
- Every add/update/unchanged outcome is returned in a MergeReport with the
  exact fields changed.

## Duplicate detection

findDuplicates() reports entities that share a normalized natural key
(e.g. same relationship who+category under two ids). It reports candidates
only - it never auto-merges, because collapsing two captured items without
owner confirmation would violate knowledge integrity.

## Hard prohibitions encoded in this contract

- No credentials, ever. systems.accessHeldBy records where access lives
  and who holds it - nothing more.
- No entity without a source. Fabricated knowledge has nowhere to hide.
- No silent modification. Merges report every change.
