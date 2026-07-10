# Successor Visual System v1 (established Stage 2, conservative)

Chosen for owner-operators typically 55+: familiar, quiet, printed-page
feel. Nothing here should feel like "an app trying to be exciting."

## Typography
- Face: Georgia (system serif fallback: Times New Roman, serif) for
  everything - headings, body, controls. One face, no font downloads.
- Base size 17px, line-height 1.65. Headings regular weight, sized by
  scale not boldness: h1 1.9rem, h2 1.35rem.
- Reading measure capped at 680px.

## Palette (all AA on white)
- Paper       #ffffff  background everywhere
- Ink         #2b2b2b  body text
- Muted       #5f5f5f  secondary text (AA at body sizes)
- Rule        #dddddd  hairline borders only, never text
- Accent      #33556e  deep slate - links, buttons, focus rings
- Accent soft #eef2f5  hover fill only
- Error text  #8b2f2f  inline validation messages

## Tone of voice
- Plain language. No jargon, no AI terminology, no exclamation points.
- Every screen that asks for something carries an italic "Why we ask"
  line explaining the reason in one or two sentences.
- Unhurried: "several unhurried sittings, not one long one."
- The disclaimer (operating knowledge only; see your CPA, attorney,
  exit planner) appears at the foot of every screen.

## Components
- Buttons: 1px accent border, white fill; .primary = accent fill, white
  text; .quiet = muted, for back/secondary actions. 2px radius - squared,
  not pill-shaped.
- Cards: 1px rule border, generous padding, for projects and sessions.
- Inputs: full-width text fields, accent border on focus, visible 3px
  focus outline for keyboard users (WCAG 2.4.7).

## Accessibility commitments
- All text AA contrast on white; focus visible on every interactive
  element; controls are real buttons/labels/inputs; no color-only meaning.
