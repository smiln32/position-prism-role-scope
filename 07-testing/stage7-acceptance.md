# Stage 7 Acceptance - Dashboard Reconciliation Table

FIXTURE business. "Dashboard" column computed by computeMetrics();
"Independent recount" tallied directly from raw model JSON with no shared code.

| Metric | Dashboard | Independent recount | Match |
|---|---|---|---|
| Completeness: areas covered | 2 | 2 | YES |
| Completeness: total areas | 50 | 50 | YES |
| Risks: count | 2 | 2 | YES |
| Risks: bands sum | 2 | 2 | YES |
| Gaps: open | 1 | 1 | YES |
| Gaps: queued | 0 | 0 | YES |
| Gaps: resolved | 0 | 0 | YES |
| Gaps: total | 1 | 1 | YES |
| Verification: verified | 3 | 3 | YES |
| Verification: total entities | 15 | 15 | YES |
| Freshness: newest capture | 2026-07-11T01:28:31.879Z | 2026-07-11T01:28:31.879Z | YES |
| Freshness: total entities | 15 | 15 | YES |

All rows match: YES - exact reconciliation

## AI export validation

- Export -> import -> validate: CLEAN
- Lossless: YES (byte-identical)
- Corrupted schemaVersion is rejected by import (proven in metrics.test.ts)

Automated: dashboard/metrics.test.ts (7 tests) in the 55-test suite.
Dashboard screenshots: no browser in this environment (logged); run the zip and screenshot the "Where things stand" screen.
