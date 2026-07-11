# D2 — Homepage Information Architecture

Module spec for rebuilding `/` as a search-first marketplace home while preserving Sectoria's trust positioning and concierge funnel.

- Foundations: [`foundations.md`](foundations.md)
- Discovery module: [`discovery-search.md`](discovery-search.md)
- Index: [`../homepage-v2-spec.md`](../homepage-v2-spec.md)
- Playbook: [`../../homepage-v2-playbook.md`](../../homepage-v2-playbook.md)

---

## 1. Current page audit (`apps/web/app/(marketplace)/page.tsx`)

| Section | What it does | Verdict |
|---|---|---|
| Hero | Trust pill + H1 + description + Explore / Get best price | Good brand voice; **wrong primary action** (no search); dual CTAs compete |
| Feature bento | "Why Sectoria" anchor + 4 feature cells | Strong trust content; **too early** — blocks discovery |
| Featured societies | 6 cards, alphabetical from `listSocietySummaries()` | Proof of inventory; **weak ranking** ("ordered alphabetically" is anti-pattern) |

Missing vs world-class: slim discovery bar, city hubs, filter presets behind progressive disclosure, trust-first featured, post-discovery trust strip, compare soft-CTA.

---

## 2. Target IA (wireframe)

```
+---------------------------------------------------------+
|  SiteHeader (existing)                                  |
+---------------------------------------------------------+
|  HERO (first viewport)                                  |
|  · One compact trust line (Verified before it's listed) |
|  · H1: buyer outcome in one line                        |
|  · One supporting sentence                              |
|  · SocietyDiscoveryBar (Search + City + Search CTA)     |
|  · City chips max 6 (live counts, muted)                |
+---------------------------------------------------------+
|  TRUST STRIP (compact 4-up, not full bento)             |
|  Verified data · Advisor negotiation · Token on platform|
|  · Compare like-for-like                                |
+---------------------------------------------------------+
|  FEATURED                                               |
|  Heading + "View all" -> /societies                     |
|  SocietyCard grid (6) — listFeatured ranking            |
+---------------------------------------------------------+
|  WHY SECTORIA (existing bento, demoted)                 |
|  Keep HSMS-linked CTA on anchor cell                    |
+---------------------------------------------------------+
|  NEXT STEP BAND                                         |
|  Compare societies · Get best price (concierge)         |
+---------------------------------------------------------+
|  SiteFooter (existing)                                  |
+---------------------------------------------------------+
```

### 2.1 Copy and CTA hierarchy (locked)

- H1 stays buyer-outcome oriented (current line is strong). Do not replace with "Search thousands of listings".
- Supporting sentence: one clause on *verified societies + advisor-negotiated price*.
- **Trust line:** keep one compact line (existing "Verified before it's listed" + shield) — **required**, not optional; not a pill wall.
- **Sole filled primary** in the hero = DiscoveryBar Search button (`size="lg"`).
- **Remove** "Explore societies" as a hero primary. Prefer omitting Get best price from the hero entirely; at most one ghost/text link. Put Get best price in the next-step band.
- Featured section copy: **never** say "ordered alphabetically" or imply cheapest-first.

### 2.2 Featured ranking (Session H3 — locked)

Implement `society.listFeatured({ limit: 6 })` in **H3** (requires H1 `startingPricePkr`). Rule:

1. `verificationTier = HSMS_LINKED` first  
2. then `VERIFIED`  
3. then by `startingPricePkr` ascending, nulls last  
4. then `name` ascending  

Do **not** ship homepage featured as `sort: 'priceAsc'` only — that trains the eye on cheap inventory and undermines trust-first first look.

Ops `Society.featuredRank Int?` is **V2.1** — out of V2 scope.

Cap: 6 cards (`FEATURED_LIMIT`). Empty/error states: existing `EmptyState` / `ErrorState` patterns.

---

## 3. Component decomposition

Extract from the page (page stays a thin server composition root):

| Component | Server/Client | Responsibility |
|---|---|---|
| `HomeHero` | Server shell + client DiscoveryBar | Trust line + headline + DiscoveryBar (`mode='home'`) + city chips |
| `HomeTrustStrip` | Server | Compact 4 trust signals |
| `HomeFeaturedSocieties` | Server | `listFeatured` + card grid |
| `HomeWhyBento` | Server | Existing bento moved down |
| `HomeNextStepBand` | Server | Compare + Get best price |

Files: `apps/web/components/marketplace/home-*.tsx` (flat under `marketplace/` to match repo convention).

**Homepage search appears first in H3** — H0 does not add a throwaway hero search row. Home bar is Search + City only (budget/type behind Filters).

---

## 4. Data fetching

- **Featured (H3):** `society.listFeatured({ limit: 6 })` applying §2.2 server-side — do not over-fetch 48 and slice arbitrarily; do not use priceAsc-only interim.
- **City chips:** `listCityFacets()` returns `{ slug, label, count }`; show `count > 0`, **max 6**, order by `count` desc; mobile horizontal scroll; count muted. Links: `/societies?citySlug=…`.
- Keep `revalidate = 3600` on the page; featured + facets are stable enough for ISR.
- Fetch facets on the homepage for DiscoveryBar + chips without forcing `force-dynamic`.

---

## 5. Motion (2–3 intentional, functional)

1. DiscoveryBar focus ring / subtle elevation when focused (token `shadow-sm` → `shadow-md`).
2. City chip press/selected state.
3. Featured cards: existing SocietyCard hover lift only — no decorative hero parallax.

All behind `prefers-reduced-motion`.

**Sticky compact search on scroll is V2.1** — not implemented in V2.

---

## 6. Accessibility

- H1 once; search input has a visible `<Label>` (or `aria-labelledby` tied to a visible "Search" label — design system: label required; placeholder is supplementary).
- City chips are links with clear names (`Societies in Lahore`).
- `aria-busy` on bar while directory transition pending (directory mode).
- Typeahead listbox pattern when H4 ships (`role="listbox"`, active descendant).

---

## 7. Analytics

**Out of V2.** Do not add a `trackMarketplaceEvent` no-op stub. Revisit in V2.1 with a real vendor if needed. No PII in any future payloads.

---

## 8. Acceptance

- [ ] First viewport: trust line + H1 + one sentence + Search/City bar + ≤6 chips; no budget/type inline; no Explore primary; no dual filled CTAs.
- [ ] Why-bento is below featured (or below trust strip), not above search.
- [ ] Featured uses `listFeatured` trust-first ranking; copy never says "ordered alphabetically".
- [ ] City chips use count-bearing facets (max 6, muted counts) and navigate to `/societies?citySlug=…`.
- [ ] Mobile 390px: bar usable, chips scroll horizontally, no horizontal page bleed.
- [ ] JSON-LD Organization + WebSite present (SearchAction updated in H5).
- [ ] No analytics stub shipped.
