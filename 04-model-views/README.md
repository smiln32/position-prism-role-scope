# Model Views - Stage 7 (dashboard, risk scoring, gap views)

Source: app/src/dashboard/metrics.ts + DashboardScreen.tsx

## Risk scoring (published formula, no black box)
Score = 40 base, +25 single point of failure, +20 no mitigation on record,
+10 not yet verified, +5/-0/-5 for high/medium/low confidence, cap 100.
Bands: 70+ high, 40-69 medium, <40 low. Each score prints its reasons in
the dashboard and in the Knowledge Risk Report.

## Dashboard ("Where things stand")
- Completeness: areas covered of 50, overall percent + per track
- Risks: count, band counts, average score, each risk with its reasons
- Open questions: open/queued/resolved counts, each gap with owner-directed
  "Mark resolved" (nothing deleted)
- Confirmed by you: verified vs total, percent
- Freshness: days since newest capture; items untouched 90+ days flagged
  with a gentle suggestion to hold a review session

## Reconciliation
Every dashboard number is recounted independently from raw model JSON in
the test suite and must match exactly. Evidence table:
07-testing/stage7-acceptance.md.

## AI export validation
Export -> import -> validate is clean and byte-identical; corrupted exports
are rejected. Proven in metrics.test.ts and the evidence file.
