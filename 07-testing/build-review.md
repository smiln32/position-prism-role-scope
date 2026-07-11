# Full-Build Cohesion & Consistency Review (post-Stage 8)

Requested by Carla. Method: file-level audit of the actual repository -
grep, diff, and regeneration checks - not recollection.

## VERIFIED CONSISTENT

1. Frozen contract held end to end. schemaVersion 1.0.0 unchanged since
   Stage 1; the Stage 1 fixture JSONs on disk regenerate byte-identically
   from source today; every later stage extended ProjectFile with additive
   optional fields only, each with a logged decision.
2. Control files match reality. STATE.md's inventory and test count (56)
   match the suite; DECISIONS.md has an entry for every deviation found in
   code; the one factual error discovered mid-build (44 vs 50 areas) was
   corrected by appended note, not silent edit.
3. Knowledge-integrity rules applied uniformly. Verbatim capture, labeled
   inference, never-delete, owner-directed resolution: the same semantics
   in the interview engine (Stage 3/4), document analysis (Stage 5),
   deliverables (Stage 6), and dashboard (Stage 7). The zero-invention
   audit and the dashboard reconciliation both run as standing tests.
4. Disclaimer language identical across App footer, deliverable headers,
   and the canonical 08-docs/DISCLAIMER.md.
5. Voice consistent. "Why we ask/why this page" on every asking screen;
   no exclamation points, no jargon, no AI terminology in user copy
   ("sitting" is used deliberately alongside "session" as the friendly
   register; "session" remains the record term).
6. Navigation closed. Eight screens, every go() target renders, every
   screen has a way back, missing-state messages everywhere.
7. Evidence trail complete: stage3/4/5/7 acceptance files, the Stage 6
   generated package with audit, Stage 8 audits and acceptance report,
   one git commit per gate.

## FOUND AND FIXED IN THIS REVIEW

A. HANDOFF.md had gone stale: it still described a Stage 4 handoff with a
   27/27 baseline. Rewritten to govern future work (API adapter, Role DNA,
   maintenance) against the true 56/56 baseline.
B. app/README.md was still the Vite template - a placeholder survivor that
   all eight gates missed. Replaced with a real project README.
C. package.json name was the scaffold default "app"; now "successor-app".

## DOCUMENTED AS KNOWN (no change needed)

D. Two fact.topic conventions coexist: the Stage 1 fixture uses free text
   ("daily routine") while Stage 4 interviews use "track-N:areaId" and
   Stage 5 documents use "document:docId". The handbook's "Other knowledge
   on record" section guarantees nothing falls through; a note now lives
   in 01-schema/README.md.
E. Point-in-time evidence files cite the test counts of their day (27, 33,
   40, 48). Correct behavior - evidence is a record, not a living doc.
F. The rule-based ceiling: structured entities (processes, decisions,
   relationships) populate only from fixtures or a future API adapter, not
   from interviews. Logged at Stage 3 and restated at Stages 6 and 8.

## Post-review verification
Build clean, lint clean, 56/56 including the acceptance run.
