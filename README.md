# Successor

**Business Owner Knowledge Succession Platform**

Successor helps a business owner get the knowledge that lives only in their
head into documents a successor, a buyer, or their family can actually use.

> Successor captures **operating knowledge only**. It does not give — and must
> never appear to give — financial, tax, legal, or estate advice. For those
> matters, work with your CPA, attorney, and exit planner.

---

## What this is

Every owner-operated business runs on knowledge that exists only in the owner's
head: why customers really stay, which handshake deals matter, how prices
actually get set, which vendor to call when everything breaks, what was tried
years ago and why it failed. When the owner exits — sale, retirement, illness —
that knowledge leaves with them, and the business the successor inherits is
worth less than the one the owner ran.

Successor draws that knowledge out — from unhurried interviews and from the
materials a business already has — and turns it into a complete **succession
package**: everything a successor, a buyer, or the family needs to run the
business the way it actually runs. People document their work in different ways,
so the goal is to meet them where they are: what they say, and what they've
already written down.

The guiding idea: **the knowledge model is the product; the documents are just
views of it.** You capture something once, and it appears — consistently —
across every document that needs it.

### Principles it never breaks

- **It never invents.** If something hasn't been captured, the documents say
  "Not yet captured" rather than filling the gap with a plausible guess.
- **It never deletes what you said.** When a newer answer replaces an older one,
  the record keeps both and shows which one you confirmed.
- **It never stores credentials.** It records *that* a login exists and *who*
  holds it — never passwords, PINs, or account numbers.
- **Everything stays on your computer.** No backend, no accounts, no telemetry.
  Nothing is sent anywhere.

---

## How it works

Successor is a single-page web app (React + TypeScript). Everything you enter is
saved locally in your browser, and you can export the whole project as one file
at any time.

Under the hood there is one central **knowledge model** with ten kinds of
entities — Facts, Processes, Relationships, Decisions, Judgment calls, History,
Systems, Commitments, Risks, and open Gaps. Every item carries where it came
from (interview, document, or inference) and a confidence level. The interviews,
the document analysis, the dashboard, and all nine deliverables read from and
write to that single model.

**The five steps of using it:**

1. **Start a project** — the business name and your name are all it needs.
2. **Sit for interview sessions** — eight parts, done in any order, one unhurried
   sitting at a time. You answer in your own words, and everything is saved
   exactly as you say it. Anything left hanging is remembered and asked again
   next time. The eight parts:
   1. The Business As It Really Runs
   2. Customers & Revenue Truths
   3. Vendors, Partners & the Outside World
   4. People & the Inside World
   5. Decisions & Judgment
   6. History & Scar Tissue
   7. Risks & Fragilities
   8. The Handoff
3. **Add documents** — vendor lists, old procedures, notes, lease summaries.
   Today you paste the text or upload a plain-text file (`.txt`, `.md`, `.csv`);
   every line is kept in its original words. If a document disagrees with
   something you said, you see both and choose which is right. (Richer inputs —
   PDFs, scanned pages, audio and video — are on the roadmap; see *Where this is
   going* below.)
4. **Watch the dashboard** — completeness, risks, open questions, and how fresh
   the record is, at a glance.
5. **Generate the succession package** — nine documents, all in your own words,
   marked wherever something still needs your confirmation:
   - Executive Knowledge Summary
   - The Successor's Handbook (the flagship)
   - Relationship Transfer Map
   - Decision Playbook
   - First Year Without the Founder
   - Institutional Memory Archive
   - Continuity & Emergency Brief
   - Knowledge Risk Report
   - AI-Ready Knowledge Export (structured JSON / Markdown)

**Keeping your own copy.** "Export this project" saves a single file you can keep
with your important papers or move to another computer with "Restore from a
project file." You can also optionally protect the data on your computer behind
a passphrase — it is asked for each time the app opens, and it is never stored
anywhere (a forgotten passphrase cannot be recovered, so keep an exported
backup).

---

## Using it as a new person

Successor is not yet hosted on a website, so today "using it" means running it on
a computer. It's straightforward.

### 1. Get the tools (once)

You need [Node.js](https://nodejs.org) installed (which includes `npm`).

### 2. Start the app

From a terminal, in the `app/` folder:

```bash
npm install      # first time only — downloads what the app needs
npm run dev      # starts the app
```

The terminal will show a local address (usually `http://localhost:5173`). Open
that in your browser and the app is running. Everything you do stays on your
machine.

### 3. Try the flow

1. Click **Start a new project** and enter a business name and your name.
2. On the project screen, **start a session** and open the guided interview.
   Answer a few questions in your own words.
3. Look around **Review & add knowledge**, **the dashboard**, and **the
   succession package** — you can generate the documents and print any of them to
   PDF.
4. When you want a backup, use **Export this project**.

That's the whole loop: interview → (optionally add documents) → review → generate
the package.

---

## Where this is going

People capture what they know in whatever form is natural to them — a written
procedure, a scanned page, a voice memo, a video walkthrough. Successor's
direction is to accept all of it and fold it into the same knowledge model, so
the source doesn't matter, only what it says.

Planned input types (not yet built):

- **PDFs and other rich documents** — read the text directly, no copy-paste.
- **Scanned pages and images (OCR)** — turn a photographed or scanned document
  into text the model can read.
- **Audio** — voice memos and recorded conversations, transcribed into the
  owner's own words.
- **Video** — screen recordings and walkthroughs, transcribed the same way.

**The design constraint that governs all of these:** the promise that nothing
leaves your computer. Each input type has a fully-local path (in-browser OCR and
transcription) and a faster, more accurate cloud path. The intended approach
mirrors the optional AI interview adapter (built and unit-tested on a draft
branch, PR #3 — **not yet part of the app**): **local-first by default, and any
cloud processing is strictly opt-in, with the owner's own key, never stored.**
No input capability will quietly send private business knowledge off the machine.

## For developers

React + TypeScript + Vite, local-first (`localStorage`), no backend, no
telemetry. Full commands and code layout are in [`app/README.md`](app/README.md).

```bash
cd app
npm install
npm run build    # typecheck + production build
npm test         # full suite, including the end-to-end acceptance run
npm run lint
```

Read [`CLAUDE.md`](CLAUDE.md) (repo root) before changing anything; the rest of
the governing documents live in [`00-control/`](00-control/), and the stage map
is [`CONTEXT.md`](CONTEXT.md). The knowledge-model schema
(`app/src/knowledge-model/`) is **frozen at v1.0.0**; changing it requires a
logged decision in `00-control/DECISIONS.md`.
