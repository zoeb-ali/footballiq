# FootballIQ design system: the wall chart

The site is drawn as a World Cup wall chart (the "WM-Spielplan" poster pinned
up in kitchens and pubs): a printed structure in ink and pitch green, with
results and the model's numbers written in afterwards in marker red. Every
choice below follows from that one object.

## Principles

1. **The bracket is the home page.** It is rebuilt from match results alone,
   so the site's first screen is also proof the data is complete.
2. **Red means written in.** Marker red is reserved for results, winners and
   model output. Printed structure (rules, links, headings) is ink or pitch.
3. **Plain words over system words.** Feature names, states and errors are
   written for a football fan, not an engineer (`src/lib/features.ts`).
4. **Honest degradation.** A saved copy is labelled "Saved copy"; the status
   light never claims "live" from a snapshot; the model's accuracy is stated
   wherever a valuation appears.
5. **Light only.** It is a print object; `color-scheme: light`.

## Colour

| Token | Hex | Use |
|---|---|---|
| paper | `#fafaf7` | page background (cool white, not cream) |
| sheet | `#ffffff` | inset panels |
| ink | `#121417` | text, bracket lines |
| ink-2 | `#50565c` | secondary text (7.1:1) |
| ink-3 | `#62686e` | tertiary text (5.4:1); never smaller than 12px |
| pitch | `#0e5e3f` | links, printed structure |
| marker | `#c8102e` | results, winners, model output, positive gap |
| cool | `#1d4e89` | second series, negative gap |
| caution | `#8a5a00` | saved-copy and degraded states |

## Type

One family, Archivo Variable (self-hosted, width axis 62–125%):
condensed and heavy for scores and FIFA codes (`.score`, `.code`, `.display`),
normal width for reading. Tabular numerals everywhere. Inputs are 16px so iOS
never zooms.

## Components

- `components/bracket/`: two-sided bracket at xl, one-sided scrollable at md,
  round tabs on phones; the champion's route drawn in red; aet/pens inline.
- `match-sheet.tsx`: score, xG, pre-match Elo odds, and an on-demand
  simulation shown against the real result.
- Charts are HTML/SVG, not a charting library: stacked probability bars, score
  matrix as a real `<table>`, SHAP bridge in log-€ with its additivity check.
- Flags: `public/flags/{FIFA}.svg` from flag-icons 7.5.0. Icons: Phosphor.

## Quality floor (checked on every page at 4 viewports)

No horizontal overflow, zero axe WCAG 2.2 AA violations, one `<h1>`, no text
under 12px, visible focus, keyboard-scrollable regions, `prefers-reduced-motion`
respected.
