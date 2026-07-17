# Document Analysis - Stage 5

Source: app/src/analysis/extract.ts + DocumentsScreen.tsx

## Intake
Paste text or upload .txt/.md/.csv. Documents are stored whole on the
project file (ProjectFile.documents) so extraction stays auditable and
conflicts can quote the original.

## Extraction (rule-based, zero fabrication)
- Every non-empty line becomes one Fact, verbatim, source kind 'document'
  with document id + "name, line N". Confidence high (documents are
  authoritative per spec), verified false until the owner confirms.
- Undefined names raise Gaps, same conservative detector as interviews.
  Since 2026-07-16 (DECISIONS.md, P4): consecutive capitalized words are ONE
  name ("Ed Kowalski" asks one question, not two), the business's and owner's
  own names are always known, ALL-CAPS labels are skipped, and name gaps cap
  at 25 per document with the overflow counted in
  AnalysisReport.nameGapsSuppressed. Facts are never capped, only the
  questions about them.
- 500-line cap per document; skipped lines are reported, never silent.

## Cross-reference & conflicts
A document line conflicts with an interview fact when they share 3+
significant content words AND their month-names or numbers are non-empty
differing sets. The conflict Gap quotes both verbatim: "The document says X.
You said Y. Which is right, or are both true?"

## Resolution (owner-directed, attributable)
UI offers: the document is right / what I said is right / both are true.
Chosen statement -> verified=true; the other -> confidence low ("both"
verifies both). Gap resolves. Nothing is ever deleted.

## Acceptance
07-testing/stage5-acceptance.md - before/after model diff for the fixture
document set with the surfaced conflict resolved end to end.
Automated: extract.test.ts in the app's test suite (the suite grows;
STATE.md carries the current count).
