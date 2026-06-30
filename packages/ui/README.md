# @sectoria/ui

**The Sectoria design system** — Modern Enterprise Minimalism + Bento Grid.
Tokens, primitives, and the trust-specific components (status/verification
badges, tax invoice, identity card, PLRA certificate) that every Sectoria
surface is built from.

Full visual spec: [`docs/design/Sectoria_Design_System.md`](../../docs/design/Sectoria_Design_System.md).
Enforced constraints: `ui-design-system-sectoria.mdc` and
`ui-ux-excellence-sectoria.mdc`.

## What this package is — and is not

- **Is:** presentational React components, design tokens, and pure display
  helpers (`formatPKR`, `maskCnic`, `formatDate`).
- **Is not:** a place for business logic or data fetching. Components take
  already-shaped, already-validated data (types from `@sectoria/types`) and
  render it. No `fetch`, no tRPC, no domain math lives here.

## Design tokens

`src/theme.css` is the **single source of truth** for every color, spacing,
radius, shadow, font, and motion token (Tailwind v4 CSS-first `@theme` — there
is no `tailwind.config.ts`). Apps import it once:

```ts
// apps/web/app/layout.tsx
import "@sectoria/ui/theme.css";
```

Never hardcode a hex/px/rgba in a component — add a token to `theme.css`
first, then use the generated Tailwind utility (`bg-success`, `text-text-primary`,
`rounded-lg`, `shadow-md`, …). Spacing uses the 4px scale (`py-2.25` = 9px).

## Usage

```tsx
import { Button, StatusBadge, TaxBreakdownCard } from "@sectoria/ui";

function Example({ breakdown }) {
  return (
    <div className="flex flex-col gap-4">
      <StatusBadge variant="success">Verified</StatusBadge>
      <TaxBreakdownCard breakdown={breakdown} />
      <Button variant="success">Confirm payment</Button>
    </div>
  );
}
```

### Money is whole rupees

The whole codebase stores and passes amounts as whole **rupees**
(`@sectoria/types` `PkrAmount` — paisa are not used). `formatPKR` groups them
as `PKR X,XXX,XXX`:

```ts
import { formatPKR } from "@sectoria/ui";

formatPKR(14_200_000); // "PKR 14,200,000"
formatPKR(0);          // "PKR 0"
```

Never use `Rs.`, `₨`, or a raw number in UI copy.

### Dates use `DD Mon YYYY`

Timestamps cross boundaries as ISO 8601 strings (`@sectoria/types`). Render
them with `formatDate` — never `MM/DD/YYYY` or bare `YYYY-MM-DD` in UI:

```ts
import { formatDate } from "@sectoria/ui";

formatDate("2026-06-12T00:00:00.000Z"); // "12 Jun 2026"
formatDate(new Date(2026, 5, 12));      // "12 Jun 2026"
```

### CNIC is masked by default

Full CNICs are shown only in explicitly authorized admin/verification views.
Everywhere else use `maskCnic` (see `security.mdc`):

```ts
import { maskCnic } from "@sectoria/ui";

maskCnic("35202-1234567-1"); // "35202-XXXXX-1"
```

### Components

| Group | Components |
|---|---|
| Primitives | `Button`, `Input`/`Label`/`FieldError`, `Select`, `Card`, `Table`, `Dialog`, `Skeleton`, `ProgressBar` |
| States | `EmptyState`, `ErrorState` (+ `*Skeleton` loaders on domain cards) |
| Badges | `StatusBadge` (success/warning/danger/info/neutral), `TrustBadge` (PLRA/NADRA/FBR/Escrow/DNFBP) |
| Domain | `TaxBreakdownCard`, `IdentityCard`, `CertificateCard` |
| SEO | `JsonLd` |

Every data-bearing component is designed for all five states (loading →
empty → error → partial → success); see the Storybook stories.

## Storybook

```bash
pnpm --filter @sectoria/ui storybook        # dev server on :6006
pnpm --filter @sectoria/ui build-storybook  # static build
```

Each component has a story with controls; the accessibility addon runs WCAG
AA checks against every story (a hard requirement per design spec §9).

## Accessibility & motion

- Color is never the only signal — badges pair a colored dot + text.
- Every animation is functional and respects `prefers-reduced-motion`
  (handled globally in `theme.css`).
- Dialogs trap focus and set `aria-modal` (Radix UI).
