# MASTER BUILD SPECIFICATION

Project Codename: Successor
Business Owner Knowledge Succession Platform
Sister product to Role DNA - shared engine, different subject, different buyer.

---

## HOW TO USE THIS SPECIFICATION

You (the AI builder) must build this product in the numbered stages below, in order, one stage at a time.

Hard rules that govern the entire build:

1. **Never begin a stage until the prior stage is approved.** At the end of every stage, stop, present the Stage Gate Report, and wait for explicit approval ("Approved, proceed to Stage N").
2. **Never build ahead.** Do not implement, stub, scaffold, or "prepare" any feature belonging to a later stage. If a later-stage feature would be convenient now, note it in DECISIONS.md and move on.
3. **The spec is the source of truth.** If you believe the spec should change, propose the change in writing, wait for approval, and record the outcome in DECISIONS.md. Never silently deviate.
4. **Re-read before you build.** At the start of every stage, re-read this specification, CLAUDE.md, STATE.md, and DECISIONS.md before writing any code.
5. **State survives sessions.** After every working session, update STATE.md so a fresh session can resume with zero verbal context.
6. **No placeholder anything.** Every screen, document, and artifact shipped in a stage must be real and complete for that stage's scope.
7. **Facts are sacred.** Never fabricate business knowledge, invent processes, or fill gaps with plausible-sounding content. Mark unknowns as unknowns.

---

## MISSION

Every owner-operated business runs on knowledge that exists only in the owner's head: why customers stay, which handshake deals matter, how prices really get set, which vendor to call when everything breaks, what was tried in 2011 and why it failed.

When the owner exits - sale, retirement, illness, death - that knowledge exits with them. The business the successor receives is worth less than the business the owner ran.

**Successor** captures the owner's operating knowledge through structured AI interviews and document analysis, and transforms it into a complete knowledge-succession package: everything a successor, a buyer, or the family needs to run the business the way it actually runs.

This is NOT financial, tax, legal, or estate succession planning. The product must state this plainly and never give advice in those domains. It captures **operating knowledge only** and refers users to their CPA, attorney, and exit planner for everything else.

---

## TARGET USER

- Owner-operators of businesses with roughly 5-500 employees, typically 55+, typically within 1-10 years of a planned exit
- Their advisors: exit planners, business brokers, CPAs, fractional COOs (a key sales channel)
- Successors and family members preparing to take over

The interface must respect this user: plain language, generous type, zero jargon, no AI terminology, every screen explaining why it's asking.

---

## CORE PHILOSOPHY

- The product documents the **owner's role in the business**, not the owner's biography.
- Knowledge is captured once and rendered many ways. **The knowledge model is the product; documents are views of it.**
- The knowledge model schema must be compatible with Role DNA's schema. An owner is the deepest, most consequential role in the company graph. The two products will eventually feed one organizational model.
- Emotional register matters. This product often gets used near retirement, illness, or a hard family conversation. The tone is steady, respectful, and unhurried - a trusted advisor, never a survey.

---

## THE KNOWLEDGE MODEL (data contract - built and frozen in Stage 1)

Entities, all first-class, all with source attribution, confidence level, and timestamps:

- **Facts** - discrete knowledge statements (confidence: high / medium / low; source: interview session, document, or inferred)
- **Processes** - name, purpose, frequency, steps, dependencies, failure points, who else knows it
- **Relationships** - customers, vendors, bankers, landlords, key employees, advisors; for each: who, why they matter, history, what they expect, transfer risk, transfer plan status
- **Decisions** - recurring decision types: how the owner decides, the real criteria, thresholds, examples from history
- **Judgment calls** - heuristics and instincts ("when a customer does X, it means Y") - the tacit layer
- **History** - what was tried, what failed, why; institutional memory
- **Systems** - software, accounts, logins-exist-where (never capture credentials), physical assets and their quirks
- **Commitments** - informal promises, handshake deals, verbal arrangements, favors owed and owing
- **Risks** - single points of failure, knowledge held by no one else, relationships that may not survive the transition
- **Gaps** - open questions the system has detected and not yet resolved

Every deliverable in Stage 6 must be generated exclusively from this model. If the model lacks something, the deliverable says "Not yet captured" - it never invents.

---

## INTERVIEW TRACKS (the heart of the product)

Eight tracks. The engine interviews like a seasoned exit advisor: warm, specific, one question at a time, always following the thread the owner opens. Each answer generates extraction into the model plus an intelligent follow-up. Unresolved threads are revisited automatically in later sessions.

1. **The Business As It Really Runs** - what the owner actually does daily/weekly/annually; what only the owner does; what breaks first without them
2. **Customers & Revenue Truths** - why customers really stay, which relationships are personal to the owner, how pricing is really set, which customers to protect and which to let go
3. **Vendors, Partners & the Outside World** - key suppliers, the banker, the landlord, the insurance agent; what each relationship rests on; handshake terms
4. **People & the Inside World** - key employees, who holds what knowledge, who could grow, who leaves when the owner does, unwritten rules of the culture
5. **Decisions & Judgment** - how big decisions get made, thresholds, the owner's instincts and rules of thumb, worked examples from real history
6. **History & Scar Tissue** - what was tried and failed, near-death moments, why things are the way they are
7. **Risks & Fragilities** - what keeps the owner up at night, single points of failure, what a buyer would find in diligence
8. **The Handoff** - advice to the successor, first 90 days, what to change slowly, what never to change, who to call and in what order

Adaptive behavior requirements: detect incomplete answers, undefined names, referenced-but-unexplained systems and people, contradictions between sessions; queue and revisit. Sessions are resumable; the owner will do this over weeks, not hours.

---

## DOCUMENT ANALYSIS

Owner uploads or pastes: org notes, vendor lists, customer lists, old SOPs, lease summaries, meeting notes, emails. Extract into the same model, cross-reference against interview knowledge, flag conflicts and gaps. Documents are authoritative unless the owner contradicts them - then ask.

---

## GENERATED DELIVERABLES (the succession package)

1. **Executive Knowledge Summary** - for the owner and their advisor: what has been captured, what remains at risk
2. **The Successor's Handbook** - the flagship: how this business actually runs, from the owner's chair
3. **Relationship Transfer Map** - every key relationship, its basis, its transfer risk, and a transfer plan checklist
4. **Decision Playbook** - recurring decisions, real criteria, thresholds, worked examples
5. **First Year Without the Founder** - month-by-month guidance: the annual rhythm, landmines, what to protect
6. **Institutional Memory Archive** - history, failures, scar tissue, "why we do it this way"
7. **Continuity & Emergency Brief** - if the owner is out tomorrow: first 48 hours, first 30 days, who to call
8. **Knowledge Risk Report** - single points of failure and unresolved gaps, scored; the document that drives further sessions
9. **AI-Ready Knowledge Export** - structured JSON/Markdown of the full model for future AI enablement

Every deliverable: professionally formatted, plain-language, versioned, exportable, and marked "Needs verification" wherever the model is uncertain. A visible disclaimer on the package: knowledge succession only; not financial, legal, or tax advice.

---

## TECHNOLOGY

- React + TypeScript + Vite, component-based, responsive, WCAG AA
- Local-first storage with full project export/import (JSON); architecture ready for future cloud sync
- Shared knowledge-model core designed so Role DNA and Successor use the same schema package
- No unnecessary dependencies

---

## WORKSPACE (create in Stage 0)

CLAUDE.md          operating rules — ROOT ONLY (moved 2026-07-16, see DECISIONS.md)
CONTEXT.md         task routing / stage map — ROOT
00-control/        STATE.md, DECISIONS.md, this spec, handoffs
01-schema/         knowledge model contract + fixtures
02-interview/      track definitions, prompts, adaptive logic
03-analysis/       document extraction
04-model-views/    model browser, gap views, risk scoring
05-deliverables/   templates + generation prompts
06-export/         AI export, project export/import
07-testing/        tests, fixtures, acceptance scripts
08-docs/           user-facing help, disclaimer language

CLAUDE.md operating rules must include at minimum: validate assumptions; never fabricate; distinguish facts from inference; track confidence; record unresolved questions; never silently modify or delete captured knowledge; version all outputs; documents authoritative unless contradicted; stop at stage gates; never build ahead; update STATE.md every session.

---

## STAGED BUILD PLAN - with gates

### Stage 0 - Foundation
**Scope:** Repo scaffold, workspace folders, CLAUDE.md, STATE.md, DECISIONS.md, empty app shell that runs.
**Done when:** App builds and runs; all control files exist with real content; folder structure matches spec.
**Gate:** Present file tree + CLAUDE.md contents. STOP. Await approval.

### Stage 1 - Knowledge Model Contract
**Scope:** Full TypeScript schema for every entity above; merge/dedupe logic; confidence and source attribution; JSON export/import of an empty and a fixture-populated model; unit tests on the schema and merge logic. No UI beyond a raw model inspector.
**Done when:** Fixture model round-trips through export/import losslessly; tests pass; schema documented in 01-schema/README.
**Gate:** Present schema doc + test results. This contract freezes here - later changes require a logged decision. STOP. Await approval.

### Stage 2 - Setup & Session Framework
**Scope:** Owner/business profile screens; session create/resume; project save/load against the Stage 1 contract; the app's visual system (typography, palette, tone) established and documented.
**Done when:** A user can create a project, close the app, and resume it losslessly.
**Gate:** Screenshots + a recorded create/close/resume walkthrough. STOP. Await approval.

### Stage 3 - Interview Engine, Track 1 only
**Scope:** The adaptive interview loop for "The Business As It Really Runs" only: question generation, answer extraction into the model, follow-up logic, gap queueing, coverage indicator. Prove the loop end-to-end on one track before widening.
**Done when:** A 10-answer session on Track 1 produces correct extractions (spot-checked against transcript), zero fabricated items, and a coverage readout.
**Gate:** Transcript + resulting model diff, side by side. STOP. Await approval.

### Stage 4 - All Eight Tracks + Cross-Session Memory
**Scope:** Remaining seven tracks; track selection and sequencing; revisiting unresolved threads across sessions; contradiction detection between sessions.
**Done when:** Multi-session test script (07-testing/) passes: contradictions flagged, threads revisited, all tracks reachable.
**Gate:** Test results + one worked contradiction example. STOP. Await approval.

### Stage 5 - Document Analysis
**Scope:** Paste/upload intake; extraction into the model; cross-reference against interview knowledge; conflict surfacing ("the document says X, you said Y - which is right?").
**Done when:** A fixture document set produces correct extractions and at least one surfaced conflict handled through the UI.
**Gate:** Before/after model diff for the fixture set. STOP. Await approval.

### Stage 6 - Deliverable Generation
**Scope:** All nine deliverables, rendered exclusively from the model; "Needs verification" behavior; versioning; markdown + print-friendly export; the disclaimer.
**Done when:** Every deliverable generates from the fixture model with zero invented content (audited line-by-line against the model) and professional formatting.
**Gate:** Full generated package for the fixture business. STOP. Await approval.

### Stage 7 - Risk Scoring, Gap Dashboard & AI Export
**Scope:** Knowledge Risk Report scoring logic; dashboard (completeness, risk, gaps, freshness); AI-ready structured export.
**Done when:** Dashboard numbers reconcile exactly with model contents; export validates against the schema.
**Gate:** Dashboard screenshots + reconciliation table. STOP. Await approval.

### Stage 8 - Hardening & Acceptance
**Scope:** Full regression pass; accessibility audit; empty/error states; copy polish; end-to-end acceptance run: new project -> interviews -> documents -> full package, no manual intervention.
**Done when:** The Definition of Done below is satisfied in a single uninterrupted acceptance run.
**Gate:** Acceptance run report. Final approval closes the build.

### Stage Gate Report format (every gate)
1. Stage scope as specified vs. as built (any deviation listed with its DECISIONS.md entry)
2. Acceptance criteria checklist, item by item
3. Evidence (screenshots, test output, diffs)
4. Anything discovered that belongs to a later stage (logged, not built)
5. The sentence: "Awaiting approval to proceed to Stage N."

---

## DEFINITION OF DONE

- Every workflow functions end to end without manual intervention
- Every generated document is polished enough to hand to a business owner or their attorney
- No placeholder text, no unfinished screens, no dead navigation
- All tests pass; acceptance script passes clean
- The knowledge model exports losslessly and validates against the frozen Stage 1 contract
- Nothing in the product gives, or appears to give, financial, tax, or legal advice

---

## BUILD PHILOSOPHY

Fewer things, executed exceptionally. Think like an exit planner, a knowledge engineer, and a successor on their first terrifying Monday. The finished product should make an owner say: "Thirty years of running this business, and for the first time it's all somewhere other than my head."
