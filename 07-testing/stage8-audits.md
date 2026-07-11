# Stage 8 Hardening Audits

## Regression
- Full suite: 56 tests passing (55 + acceptance run)
- Build: clean (tsc + vite)
- Lint: oxlint, 0 warnings, 0 errors on all source files

## Navigation audit
Eight screens defined (home, new-project, project, interview, documents,
deliverables, dashboard, inspector); every go() target has a render branch;
every screen has a back path; missing project/session states render a calm
message with a way back. No dead navigation.

## Accessibility audit (code-level; no browser in this environment)
- Contrast: ink #2b2b2b (12.6:1), muted #5f5f5f (5.9:1), accent #33556e
  (7.7:1), error #8b2f2f (7.6:1) - all AA on white at body sizes
- Focus: 3px visible outline on every interactive element (WCAG 2.4.7)
- FIXED this stage: hidden file inputs used display:none, unreachable by
  keyboard; now .visually-hidden (clip technique), fully focusable
- Semantics: real button/label/input/textarea elements throughout; textareas
  carry aria-labels; headings descend in order; no color-only meaning
- Type: 17px serif base, 1.65 line height, 680px measure

## Empty & error states
- Home with no projects; project/session not found; invalid or corrupt
  import (loud, specific errors); empty document paste; empty interview
  answer (ADDED this stage: gentle nudge instead of silence); empty model
  deliverables ("Not yet captured."); empty dashboard (zeros, no division
  errors); top-level error boundary (ADDED this stage: calm recovery screen,
  data-safety reassurance, reload)

## Copy audit
- No AI terminology anywhere in user-facing copy (the export deliverable's
  formal title is the one spec-mandated exception)
- FIXED this stage: "Download the model (JSON)" -> "Download the raw record
  (JSON)" - "model" is jargon to this audience
- Every asking screen has a "why we ask"; disclaimer at every screen foot
  and every document head; tone steady and unhurried throughout
