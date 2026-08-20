# Design

<!-- impeccable:design-schema 1 -->

## Platform

web

## Visual mode

Landing (`/`) and auth screens (`/login`, `/registro`, `/recuperar-contrasena`, `/legal/*`) are **Persuade** — always dark, always on the particle-swoosh hero background where present. The authenticated app shell (`(protected)/*`: Dashboard, Formulaciones, Configuración, etc.) is **Operate** — light/dark toggle via `ThemeProvider`, no marketing chrome.

## Color

- Marketing/auth surfaces: near-black grounds — `#050816` (page background, header, footer) and `#0b0a16` (card interiors, showcase panels). Never pure black.
- App-shell surfaces: `--background`/`--foreground` CSS vars, `#f3f8fc` light / `#0b0a16` dark, toggled via `.dark` on `<html>`.
- Accent: violet `#8B5CF6` is the primary accent (icons, links, focus rings, emphasis text). Cyan `#00B8FF` is the secondary/"live" signal (status dots, live badges). Never invert their roles.
- `--brand-gradient` (`linear-gradient(90deg, #00b8ff → #3b82f6 → #6366f1 → #8b5cf6 → #d946ef)`) is reserved for UI chrome with real directional presence — primary button fill (as a 1.5px border technique: gradient bg + inset dark fill), showcase card ring, progress-bar fills, logomark stroke. **Never on text** — no gradient-text emphasis; emphasis comes from color, weight, or size (see `Logo`/`SidebarLogo` for the gradient-stroke SVG pattern, `Button`/`ButtonLink` for the gradient-border technique).
- Semantic: emerald-400 for positive deltas/profit, amber for 1st-place rank, zinc-300 for 2nd, orange for 3rd.
- Strategy: Committed — the gradient accent carries real weight on primary actions and the showcase card, against a restrained near-black ground everywhere else. Not full-palette, not drenched.

## Typography

Three shared tokens (`apps/frontend/src/app/globals.css` `@theme inline`, sourced from `next/font/google` in `app/layout.tsx`), cascading to the whole app via Tailwind's `font-sans` / `font-heading` / `font-mono`:

- `--font-heading` → **Space Grotesk** (weights 500/600/700 loaded). Headings, wordmark, KPI labels in showcase cards. Chosen over the default Plus Jakarta Sans for a more technical, engineered point of view matching a serious costing tool for manufacturers — not a consumer-startup face.
- `--font-sans` → **IBM Plex Sans** (400/500/600/700). Body copy and all interior UI — legible at small sizes in dense tables (Auditoría, Reportes). Replaces Geist, the un-customized Next.js default; using it anywhere is a regression, not a neutral choice.
- `--font-mono` → **Space Mono** (400/700). Reserved for actual data/measurement: prices, percentages, KPI values, table numerals, kickers/timestamps. Shares its name/DNA with Space Grotesk — the pairing is deliberate, not two unrelated faces. Never used as a "technical" costume on non-numeric copy.
- Only these weights are loaded. Do not use `font-extrabold`/`font-black` (800/900) — the browser will synthesize a fake bold. Wordmark and headline emphasis top out at `font-bold` (700).
- Numbers in product-preview UI get `[font-variant-numeric:tabular-nums]` so digits don't shift width as they animate (see `HeroShowcase`).

## Components & surface conventions

- Cards: `rounded-2xl` (marketing) / `rounded-xl` or `rounded-lg` (dense in-app tiles), `border border-white/10`, `bg-white/3` to `bg-white/5` fill. Never nested cards.
- Buttons: pill (`rounded-full`). Primary = gradient-border technique (see `Button.tsx`/`buttonClasses`) with a glow shadow tied to the violet accent; Ghost = plain white/10 border. Both wrap in a Framer Motion `whileHover: scale 1.02` / `whileTap: scale 0.98` spring — this is the one interactive-affordance motion signature, don't invent a second one per component.
- Motion: `RevealOnLoad` (opacity+y fade, staggered `delay` props) is the one entrance-motion grammar for landing sections — reuse it, don't add a second entrance style. Respect `useReducedMotion` for anything beyond opacity/transform (see the `HeroShowcase` cursor-tilt).
- Icons: `lucide-react`, one consistent stroke weight, sized `h-4 w-4` to `h-5 w-5` depending on density. No emoji as icons.
- Data viz in the hero showcase (KPI tiles, ranked bars) is hand-authored, not a generic chart library — keep it that way for marketing use; a real charting need in the app interior is a separate decision.
- Container: `mx-auto max-w-7xl px-6 lg:px-8` (`Container.tsx`) — the one page-width wrapper, reused everywhere.

## Copy voice

Spanish (es-CO). Direct, specific to real product mechanics — names real modules (Producción, Costos, registro sanitario) instead of generic SaaS language. Proof lines lean on real, verifiable facts (test count, coverage percentage) rather than testimonials or customer logos, since [[project-prodexa-going-to-real-clients]] — no fabricated social proof until real pilots exist.

## Known debt / not yet extended

Typography tokens cascade app-wide (confirmed on `/`, `/login`, and — as of 2026-08-20 — the **interior app screens** too: Dashboard, Formulaciones, Configuración, Auditoría, Reportes now apply `font-heading` to every heading and `font-mono` to KPI/price/percentage/table numerals, matching the hand-applied convention used on `/` and `/login`). Reportes' `h4` subsections were also resized (`text-xs` vs the parent `h3`'s `text-sm`) so nested headings are visually, not just semantically, subordinate.
