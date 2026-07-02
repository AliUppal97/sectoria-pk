# M7 — Sub-community / phase sections

> Read with [`foundations.md`](foundations.md). Build session: UI **S8** (uses existing inventory data; minimal/no new model).

**Problem:** Phases/blocks are strings on `InventoryCategory`. Urban City presents sub-communities (City Oasis, City Tech…) as rich destinations.

**Approach (minimal, no new public route initially):** group the existing inventory by `phase` on the profile and render a `society-phases.tsx` section: each phase shows its blocks, category cards, starting price, availability, and (optional) a `kind=GALLERY` image filtered by a `phase` tag. Add an optional `InventoryCategory.phaseSlug` only if deep-linking to `#phase` anchors is needed; otherwise derive grouping at read time. Defer dedicated `/[society]/[phase]` routes to a later iteration (documented as a follow-up, not built now) to keep the diff small.

**Acceptance:** inventory is grouped by phase with per-phase summary; existing flat category grid remains available; concierge quote CTA unchanged.
