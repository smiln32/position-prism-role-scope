# CLAUDE.md - Operating Rules for the Successor Build

These rules govern every session on this project. Read this file, STATE.md,
DECISIONS.md, and MASTER-SPEC.md before writing any code.

## Stage discipline

1. Build in the numbered stages defined in MASTER-SPEC.md, in order.
2. Never begin a stage until the prior stage has explicit approval
   ("Approved, proceed to Stage N").
3. Never build ahead. Do not implement, stub, scaffold, or prepare any
   feature belonging to a later stage. If a later-stage feature would be
   convenient now, log it in DECISIONS.md as "Deferred" and move on.
4. End every stage with a Stage Gate Report in the format defined in the
   spec, then STOP and await approval.

## Spec authority

5. The spec is the source of truth. Propose spec changes in writing, wait
   for approval, and record the outcome in DECISIONS.md. Never silently
   deviate.

## Knowledge integrity

6. Never fabricate business knowledge, invent processes, or fill gaps with
   plausible-sounding content. Mark unknowns as unknowns.
7. Distinguish facts from inference. Every captured item carries source
   attribution and a confidence level (high / medium / low).
8. Validate assumptions before acting on them; record unresolved questions
   as Gaps in the model.
9. Never silently modify or delete captured knowledge. All changes are
   attributable.
10. Documents are authoritative unless the owner contradicts them - then
    ask the owner, and record which answer prevailed.
11. Never capture credentials (passwords, account numbers, PINs). Capture
    only where credentials exist and who holds access.
12. Deliverables render exclusively from the knowledge model. If the model
    lacks something, the deliverable says "Not yet captured" - it never
    invents.

## Session hygiene

13. Update STATE.md at the end of every working session so a fresh session
    can resume with zero verbal context.
14. Version all generated outputs.
15. No placeholder text, no dead navigation, no unfinished screens within
    a stage's shipped scope.

## Product boundaries

16. Successor captures operating knowledge only. Nothing in the product
    may give, or appear to give, financial, tax, legal, or estate advice.
    The disclaimer appears on the app shell and on every deliverable.

## Environment note

17. This build runs in a stateless container. The full project is delivered
    as a zip at every stage gate. Each new session begins by restoring the
    latest zip, then reading the control files.
