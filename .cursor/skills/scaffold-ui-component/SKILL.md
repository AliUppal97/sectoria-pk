---
name: scaffold-ui-component
description: Scaffold a reusable, well-decomposed UI component or page section with the correct server/client split, all five UI states, design-system tokens, and dynamic import for heavy client widgets. Use when adding a marketplace/portal section or a shared presentational component, or implementing a Society Profile V2 UI session (S4-S10).
disable-model-invocation: true
---

# Scaffold a UI Component / Section

Build UI as small composable pieces, not a god component. Mirror existing
sections like `apps/web/components/marketplace/society-location-section.tsx`
and the dynamic-import pattern in `society-location-map-dynamic.tsx`. Honors
`code-modularity-and-structure.mdc`, `nextjs-app-router.mdc`,
`ui-design-system-sectoria.mdc`, and `ui-ux-excellence-sectoria.mdc`.

> Attach `@docs/design/Sectoria_Design_System.md` when you need exact tokens,
> bento layout, or component anatomy.

## Decide where it lives

| Component | Home |
|---|---|
| Reusable, presentational, no data/business logic | `packages/ui` (+ Storybook) |
| Feature/page-specific | `apps/web/components/<area>/<name>.tsx` |

Never trap a reusable component inside a route folder; lift it to the right
shared home (`code-modularity-and-structure.mdc`).

## Steps

```
- [ ] 1. Server Component by default; data fetched server-side via getApi()
- [ ] 2. Decompose: one section per file; extract sub-sections into named components
- [ ] 3. Push "use client" to the smallest interactive leaf only
- [ ] 4. Heavy/browser-only widget -> next/dynamic with a skeleton fallback
- [ ] 5. Typed props as a single object; PKR/CNIC via shared formatters
- [ ] 6. Tokens only — no inline hex / arbitrary spacing
- [ ] 7. Implement all five states
- [ ] 8. next/image with width/height; no raw <img>
```

### Server vs client

- Default to a Server Component. Add `"use client"` only for real interactivity
  (state, effects, browser APIs, handlers) and wrap just the interactive leaf —
  not the whole section (`nextjs-app-router.mdc`).
- Reusable client logic → a custom hook in a `hooks/` file, not duplicated
  effect/state.
- Client-only or heavy widgets (maps, lightbox, charts, video) → `next/dynamic`
  with `ssr: false` and a skeleton, to preserve ISR/SEO on the server page
  (pattern: `society-location-map-dynamic.tsx`).

### Decomposition

- A section that renders several independent blocks is a god component — split
  each block into its own named component (the society profile composes
  `society-location-section`, `society-payment-plans`, `society-updates-timeline`,
  etc.). Keep files focused (~200–300 lines is a split signal).

### Design system & five states

- Use design tokens from `theme.css`; never inline a hex color or arbitrary
  spacing value (`ui-design-system-sectoria.mdc`). Format money/identifiers with
  the shared `formatPKR` / `maskCnic` helpers.
- Implement every state (`ui-ux-excellence-sectoria.mdc`): **empty, loading,
  error, partial, ideal**. Empty states degrade gracefully (e.g. a placeholder),
  never a blank gap.
- Money/destructive actions use a confirm dialog with the PKR amount and
  consequence — not a fire-and-forget toast.

### Concierge CTAs

Public-profile CTAs funnel to the quote-request flow (`QuoteRequestForm` /
advisor) — never a self-serve "Book Now" or buyer↔dealer contact path
(`concierge-model.mdc`).

## Verify

`pnpm turbo run test lint typecheck`. Visually confirm each of the five states
renders and that there is no layout shift (images sized, aspect ratio reserved).
For `packages/ui` components, add/refresh the Storybook story.
