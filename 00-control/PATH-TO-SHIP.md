# PATH TO SHIP — from working prototype to solid product

_Created 2026-07-15. What stands between the current build and a product that can
be handed to a real business owner (or sold through an advisor)._

The staged build (Stages 0–8) is **complete and green** — 106 tests, clean build
and lint, everything in `MASTER-SPEC.md` built. What follows is **not** part of
that build; it is the separate work of turning a solid local prototype into a
shippable product. Nothing here is started. Governance still applies (see
`CLAUDE.md`): never fabricate, labeled inference only, no stored credentials,
zero-invention audit stays green, frozen schema untouched without a logged
decision.

---

## Three decisions the owner must make first

Everything below depends on these. They are business/product calls, not
engineering ones.

1. **Distribution — website or installable app?**
   - **Hosted website** (easiest): serve the static build; each person's data
     stays in their own browser. Fast to stand up.
   - **Desktop app** (Electron/Tauri): a real "install it, your data lives in a
     file on your machine" product. Stronger fit for the "nothing leaves your
     computer" promise, works offline, sturdier storage.
   - _This choice drives most of Tier 1._

2. **Free or paid (v1)?**
   A local-only app with no backend is hard to charge for — there is no server
   to gate access. If paid, that adds licensing/payment, and possibly a thin
   backend, which touches the privacy story. The spec points at selling *through
   advisors* (exit planners, brokers, fractional COOs), so this matters.

3. **Does the optional AI interview adapter (PR #3) ship in v1, or get cut?**
   Built and unit-tested; the live path was never run against a real key. Either
   verify-and-include, or shelve it for v1 to keep the release clean.

---

## Tier 1 — Blocks shipping at all

- **Distribution.** Actually host or package the app (follows decision #1).
- **Data durability — the #1 real-world risk.** Today everything lives in browser
  `localStorage`, which a browser can clear and which is size-limited. For a
  product holding years of irreplaceable knowledge, that is fragile. Needs
  bulletproof, prominent backup prompting (or the file-based desktop route).
  Backup/recovery + export already exist (PRs #6, #4) — this is about making loss
  effectively impossible and obvious to the user.
- **Real-browser testing.** Current tests run in a simulated DOM (jsdom), not
  real Chrome/Safari/Firefox/Edge. Test on real devices before strangers do.

## Tier 2 — Quality bar for a product you charge for or put your name on

- **Accessibility audit (WCAG AA).** Required by the spec; deferred during the
  build. Real product, real audit.
- **Real PDF export.** Deliverables are currently browser "Print to PDF." A
  shipped product wants cleanly generated PDFs.
- **Pre-ship security review.** It holds sensitive business information.
  Data-at-rest encryption already exists (PR #4); do a proper pass anyway.
- **Onboarding / first run.** A guided start and optionally a sample project, so
  a first-timer is not staring at a blank screen.

## Tier 3 — Trust & commercial (needed if selling)

- **Privacy policy, terms, plain data-handling statement.** Even "it is all
  local," said clearly, builds trust with this audience.
- **Licensing / payment path** (follows decision #2).
- **Update + support path.** How users get fixes and new versions.

## Tier 4 — Roadmap (post-v1, not launch blockers)

- **Richer inputs** (decided direction — local-first; see DECISIONS.md
  2026-07-15). Build order: **PDF text → in-browser OCR → audio → video.** Any
  future cloud processing is strictly opt-in, owner's own key, never stored.
- **Role DNA schema sharing** (extract `knowledge-model/` into a shared package)
  and **cloud sync** — both need an owner decision before starting.

---

## The short version

To ship a *solid v1*: **Tier 1 + Tier 2**, plus **Tier 3** if it is a paid
product. Rich inputs (Tier 4) are a strong fast-follow, not a launch blocker.
**Start with decision #1 (website vs. app)** — almost everything in Tier 1
depends on it. The single biggest technical risk to fix before real users is
**data durability** — do not let anyone lose weeks of work to a cleared browser.
