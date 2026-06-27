# Sectoria.pk — Design System Specification
## Enterprise Minimalism + Bento Grid
### Version 1.0 — The Complete Visual & Interaction Language

---

## 1. DESIGN PHILOSOPHY & STYLE DECISION

### The verdict on all 10 styles — and why Sectoria uses none of them alone

| Style | Verdict for Sectoria | Reason |
|---|---|---|
| Skeuomorphism | ❌ Reject | Outdated, adds visual noise to data-dense compliance screens |
| Neomorphism | ❌ Reject | Fails WCAG contrast. Interactive vs. static elements are indistinguishable |
| Glassmorphism | ⚠️ Accent only | Beautiful but hurts readability on tax/data pages. Use sparingly for certificates and hero moments |
| Claymorphism | ❌ Reject | Too playful for a financial-compliance platform handling PKR millions |
| Minimalism | ✅ Foundation | Stripe-level discipline. Every element earns its place. Trust through restraint |
| Maximalism | ❌ Reject | Overwhelming on data-heavy screens. Signals noise, not authority |
| Brutalism | ❌ Reject | Too aggressive and alienating for a trust-first product |
| Liquid Glass | ⚠️ Accent only | Premium feel for certificate generation moments only |
| Bento Grid | ✅ Layout system | Natural fit for society comparison, dashboards, feature sections |
| Spatial UI | ❌ Reject | Too experimental for broad Pakistani device compatibility |

### Sectoria's design language

**Modern Enterprise Minimalism + Bento Grid layout system with selective Glassmorphism accents**

This is the same combination Linear + Stripe use — currently the most
respected, most copied B2B SaaS design language in the world. For
Sectoria, it does something more specific: it signals institutional
authority (the same visual discipline governments and banks use) while
remaining modern enough to feel like a product built for 2026 and beyond.

The single differentiation from a generic SaaS: every trust-specific
element (verification badges, PLRA certificates, compliance scores)
gets a design treatment that feels official — not decorative.

---

## 2. COLOR SYSTEM

### 2.1 Design principle

Stripe's dashboard demonstrates a rigorous token system in action — neutral surfaces, one primary accent, and semantic colors reserved for status. Zero decorative color. Every color token earns its place by conveying information.

Sectoria follows this exact principle. Colors are never decorative.

### 2.2 Complete token set (Tailwind v4 `@theme` block)

```css
/* packages/ui/src/theme.css */

@import "tailwindcss";

@theme {
  /* ─── Brand ─────────────────────────────────────────────── */
  --color-brand-navy:        #0A1628;  /* primary surface — sidebar, dark panels */
  --color-brand-navy-mid:    #0F3460;  /* hover, active states */
  --color-brand-navy-light:  #1A5276;  /* borders on dark surfaces */
  --color-brand-accent:      #00C896;  /* emerald — verified, compliant, success */
  --color-brand-accent-dim:  #00A87E;  /* accent hover */

  /* ─── Surfaces ───────────────────────────────────────────── */
  --color-surface-base:      #F7F8FA;  /* page background */
  --color-surface-card:      #FFFFFF;  /* card background */
  --color-surface-elevated:  #FFFFFF;  /* modal, popover */
  --color-surface-subtle:    #F0F2F5;  /* table stripes, code bg */
  --color-surface-inset:     #E8EBF0;  /* input background (unfocused) */

  /* ─── Border ─────────────────────────────────────────────── */
  --color-border-base:       #E2E6EC;  /* default card/input border */
  --color-border-strong:     #C8CDD6;  /* table headers, dividers */
  --color-border-focus:      #0F3460;  /* navy focus ring */

  /* ─── Text ───────────────────────────────────────────────── */
  --color-text-primary:      #0A1628;  /* headings — brand navy */
  --color-text-secondary:    #3D4F6B;  /* body copy */
  --color-text-tertiary:     #7A8AA0;  /* labels, captions, placeholders */
  --color-text-disabled:     #B0BAC9;  /* disabled state */
  --color-text-inverse:      #FFFFFF;  /* text on dark backgrounds */
  --color-text-accent:       #00A87E;  /* accent text links */

  /* ─── Semantic — Status ──────────────────────────────────── */
  --color-success:           #00C896;  /* verified, compliant, complete */
  --color-success-bg:        #E6FAF5;
  --color-success-border:    #A7EDD9;
  --color-success-text:      #065F46;

  --color-warning:           #F59E0B;  /* pending, awaiting action */
  --color-warning-bg:        #FFFBEB;
  --color-warning-border:    #FDE68A;
  --color-warning-text:      #92400E;

  --color-danger:            #EF4444;  /* blocked, rejected, non-filer flag */
  --color-danger-bg:         #FEF2F2;
  --color-danger-border:     #FECACA;
  --color-danger-text:       #991B1B;

  --color-info:              #3B82F6;  /* informational, in-progress */
  --color-info-bg:           #EFF6FF;
  --color-info-border:       #BFDBFE;
  --color-info-text:         #1E40AF;

  /* ─── Special — Certificate & Premium Moments ───────────── */
  --color-cert-from:         #0A1628;  /* certificate gradient start */
  --color-cert-to:           #0F3460;  /* certificate gradient end */
  --color-cert-accent:       #00C896;  /* cert verified badge */
  --color-cert-glass:        rgba(255,255,255,0.06);  /* glass card on cert */

  /* ─── Typography ────────────────────────────────────────── */
  --font-sans:     'Inter', system-ui, -apple-system, sans-serif;
  --font-mono:     'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
  --font-display:  'Inter', system-ui, sans-serif;

  /* ─── Type scale ─────────────────────────────────────────── */
  --text-xs:    0.75rem;    /* 12px — labels, captions, metadata */
  --text-sm:    0.8125rem;  /* 13px — body, table cells */
  --text-base:  0.875rem;   /* 14px — default body */
  --text-md:    1rem;       /* 16px — section headers */
  --text-lg:    1.125rem;   /* 18px — card titles */
  --text-xl:    1.25rem;    /* 20px — page titles */
  --text-2xl:   1.5rem;     /* 24px — hero section subtitles */
  --text-3xl:   1.875rem;   /* 30px — hero headlines */
  --text-4xl:   2.25rem;    /* 36px — landing hero */
  --text-5xl:   3rem;       /* 48px — marketing hero display */

  /* ─── Spacing scale (4px base grid) ─────────────────────── */
  --space-1:   0.25rem;   /* 4px */
  --space-2:   0.5rem;    /* 8px */
  --space-3:   0.75rem;   /* 12px */
  --space-4:   1rem;      /* 16px */
  --space-5:   1.25rem;   /* 20px */
  --space-6:   1.5rem;    /* 24px */
  --space-8:   2rem;      /* 32px */
  --space-10:  2.5rem;    /* 40px */
  --space-12:  3rem;      /* 48px */
  --space-16:  4rem;      /* 64px */
  --space-20:  5rem;      /* 80px */
  --space-24:  6rem;      /* 96px */

  /* ─── Border radius ──────────────────────────────────────── */
  --radius-sm:   0.375rem;  /* 6px — small elements, badges */
  --radius-md:   0.5rem;    /* 8px — buttons, inputs */
  --radius-lg:   0.75rem;   /* 12px — cards, panels */
  --radius-xl:   1rem;      /* 16px — large cards, modals */
  --radius-2xl:  1.25rem;   /* 20px — bento cells, society cards */
  --radius-full: 9999px;    /* pills, avatars */

  /* ─── Shadows ────────────────────────────────────────────── */
  --shadow-xs:   0 1px 2px 0 rgba(10,22,40,0.04);
  --shadow-sm:   0 1px 3px 0 rgba(10,22,40,0.06), 0 1px 2px -1px rgba(10,22,40,0.04);
  --shadow-md:   0 4px 6px -1px rgba(10,22,40,0.07), 0 2px 4px -2px rgba(10,22,40,0.04);
  --shadow-lg:   0 10px 15px -3px rgba(10,22,40,0.08), 0 4px 6px -4px rgba(10,22,40,0.04);
  --shadow-xl:   0 20px 25px -5px rgba(10,22,40,0.08), 0 8px 10px -6px rgba(10,22,40,0.04);

  /* ─── Motion ─────────────────────────────────────────────── */
  --ease-default:    cubic-bezier(0.4, 0, 0.2, 1);
  --ease-in:         cubic-bezier(0.4, 0, 1, 1);
  --ease-out:        cubic-bezier(0, 0, 0.2, 1);
  --ease-spring:     cubic-bezier(0.34, 1.56, 0.64, 1);  /* bouncy — use for success moments only */
  --duration-fast:   150ms;
  --duration-base:   200ms;
  --duration-slow:   300ms;
  --duration-slower: 500ms;
}
```

---

## 3. TYPOGRAPHY

### 3.1 Rules

- **Inter** for all UI text — headings, body, labels, buttons
- **JetBrains Mono** for all data: CNIC numbers, NTN, serial codes, PKR amounts in tables, PLRA certificate numbers, CPR reference numbers
- Never mix a third typeface. Two is already the maximum
- Headings: `font-weight: 700` at display sizes, `600` at section level
- Body: `font-weight: 400` default, `500` for emphasis
- All caps + letter-spacing `0.06em` for category labels, table headers, badge text only

### 3.2 Usage examples

```
Society name (card title):     Inter 700, 18px, color-text-primary
Category badge (label):        Inter 600, 11px, uppercase, letter-spacing 0.06em
Body copy (description):       Inter 400, 14px, color-text-secondary
Table cell (data):             Inter 400, 13px, color-text-primary
CNIC number:                   JetBrains Mono 400, 13px
PKR amount (large):            JetBrains Mono 700, 18px, color-text-primary
PKR amount (table cell):       JetBrains Mono 600, 13px
PLRA certificate number:       JetBrains Mono 500, 12px, color-text-tertiary
Status badge text:             Inter 600, 11px
```

---

## 4. LAYOUT SYSTEM

### 4.1 Bento Grid — the primary layout language

A bento grid is a section composed of cells of different sizes, each holding one self-contained piece of content, arranged so the cell sizes themselves rank what matters. The cell becomes the unit of meaning, and the eye reads importance from size before it reads a word.

Sectoria uses bento grid for:
- Society comparison pages
- Dashboard metric sections
- Feature/benefits sections on the public marketplace
- Compliance dashboard
- Admin revenue overview

**Core grid rules:**
```css
/* 4-column desktop, 2-column tablet, 1-column mobile */
.bento-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;         /* gutter = half of inner padding */
}
.bento-cell { padding: 24px; border-radius: 20px; }

/* Sizes — cell importance = cell size */
.bento-anchor  { grid-column: span 2; grid-row: span 2; }  /* hero metric / primary feature */
.bento-wide    { grid-column: span 2; }                     /* secondary feature */
.bento-tall    { grid-row: span 2; }                        /* supporting detail */
.bento-unit    { grid-column: span 1; }                     /* smallest unit */

@media (max-width: 1024px) {
  .bento-grid  { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
  .bento-grid  { grid-template-columns: 1fr; }
  .bento-anchor, .bento-wide { grid-column: span 1; grid-row: span 1; }
}
```

### 4.2 Page-level layout rules

```
Sidebar width:          220px (desktop), collapsed on mobile
Content max-width:      1280px (marketplace), 1024px (portals)
Content padding:        24px desktop, 16px mobile
Section gap:            32px between major sections
Card internal padding:  20px default, 24px for featured/bento cells
Table cell padding:     11px vertical, 12px horizontal
```

### 4.3 Subtle background grid (Vercel aesthetic)

A visible, decorative element that creates texture and depth — set grid lines to 1px width, light gray, reduce layer opacity to 10-20%. The grid should be barely visible.

Apply on the public marketplace hero and section backgrounds only:
```css
.bg-grid {
  background-image:
    linear-gradient(var(--color-border-base) 1px, transparent 1px),
    linear-gradient(90deg, var(--color-border-base) 1px, transparent 1px);
  background-size: 40px 40px;
  opacity: 0.15;
}
```

---

## 5. COMPONENT DESIGN SPECIFICATIONS

### 5.1 Society Card (primary marketplace component)

```
Shape:        Bento cell — 20px border-radius
Background:   White card
Border:       1px solid color-border-base
Shadow:       shadow-sm by default, shadow-md on hover
Hover:        transform: translateY(-2px), border-color shifts to color-brand-navy-light
Image area:   160px height, object-cover, top-rounded to match card
Content:      24px padding
Badge row:    verification badges immediately below image — PLRA / LDA / HSMS
Title:        Inter 700 18px color-text-primary
Location:     Inter 400 13px color-text-tertiary with a location icon
Price range:  JetBrains Mono 600 15px color-text-primary
CTA button:   Full width, at card bottom
```

### 5.2 Comparison Table

```
Layout:         Sticky left column (society name), scrollable right columns
Header row:     color-surface-subtle background, Inter 600 12px uppercase
Data cells:     Inter 400 13px, alternating row background every other row
Highlight cell: color-info-bg when value is best-in-comparison
Missing data:   "—" in color-text-disabled, never empty
```

### 5.3 Status & Verification Badges

The most used element in the product. Every badge follows this pattern:

```
Shape:    pill (border-radius: 9999px)
Padding:  3px 10px
Font:     Inter 600 11px, letter-spacing 0.02em
Dot:      6px circle, same hue as text, animates (pulse) when PENDING

Colors:
  VERIFIED / COMPLIANT / EXECUTED:   bg=color-success-bg  text=color-success-text  dot=color-success
  PENDING / AWAITING:                bg=color-warning-bg  text=color-warning-text  dot=color-warning (pulsing)
  BLOCKED / REJECTED / NON-FILER:    bg=color-danger-bg   text=color-danger-text   dot=color-danger
  IN-PROGRESS / INFO:                bg=color-info-bg     text=color-info-text     dot=color-info
  NEUTRAL / DRAFT:                   bg=color-surface-subtle text=color-text-secondary
```

Trust-specific badge variants (visually heavier — these are proof, not status):
```
PLRA Verified:   emerald background, shield icon, white text
NADRA Verified:  navy background, fingerprint icon, white text
FBR Active Filer: forest green, checkmark, white text
Escrow Protected: amber-to-gold gradient, lock icon, white text
```

### 5.4 Tax Breakdown Card

```
Container:    color-surface-subtle, border color-border-base, 10px radius
Font family:  JetBrains Mono throughout (this is financial data)
Row format:   flex justify-between, 5px padding top/bottom, 1px border-bottom
Key:          color-text-secondary
Value:        color-text-primary font-weight 600
Section dividers: 1px dashed color-border-base, 8px top margin
Total row:    2px solid color-brand-navy-mid top border, Inter 700 for label and value
              value: 18px, color-brand-navy
```

### 5.5 PLRA Property Certificate

The premium glassmorphism moment. Use only here.

```
Container:
  background: linear-gradient(135deg, color-cert-from 0%, color-cert-to 100%)
  border-radius: 16px
  padding: 28px
  position: relative
  overflow: hidden

Decorative circle:
  position: absolute, top:-40px right:-40px
  200px × 200px, border-radius: 50%
  background: rgba(255,255,255,0.04)

Header strip: emerald "PLRA VERIFIED" badge + title + subtitle in white
Data grid: 2-column grid, each cell has glass card treatment:
  background: rgba(255,255,255,0.06)
  border: 1px solid rgba(255,255,255,0.10)
  border-radius: 8px, padding: 10px 12px
  label: 10px uppercase color rgba(255,255,255,0.45)
  value: 13px Inter 600 white

QR code: white background 8px radius, bottom right
Footer: scan instruction text + PLRA domain in rgba(255,255,255,0.45)
```

### 5.6 Buttons

```
Primary:
  bg=color-brand-navy, text=white, radius=8px, padding=9px 16px
  font=Inter 600 13px
  hover: bg=color-brand-navy-mid, transform none
  active: scale(0.98)
  focus: 2px offset ring color-brand-navy-light

Success / Confirm:
  bg=color-brand-accent, text=white
  hover: bg=color-brand-accent-dim

Ghost / Secondary:
  bg=transparent, text=color-text-secondary
  border=1px solid color-border-base
  hover: bg=color-surface-subtle

Destructive:
  bg=color-danger, text=white

Disabled (all variants):
  opacity: 0.45, cursor: not-allowed

Sizes:
  sm: padding 6px 12px, font-size 12px
  default: padding 9px 16px, font-size 13px
  lg: padding 12px 20px, font-size 14px
```

### 5.7 Form inputs

```
Height:         38px default
Border:         1px solid color-border-base
Border-radius:  8px
Background:     color-surface-card
Font:           Inter 400 13px color-text-primary
Placeholder:    color-text-disabled

Focus:          border-color = color-border-focus, no box-shadow glow effect
Error state:    border-color = color-danger, error message below in 12px color-danger-text
Valid state:    border-color = color-success (only after user has blurred field)

CNIC / NTN inputs:
  font-family: JetBrains Mono
  letter-spacing: 0.05em
  placeholder: "XXXXX-XXXXXXX-X"
```

### 5.8 Data Tables

```
Table container:  card (white bg, border, 12px radius), no padding — table fills it
Header:           color-surface-subtle bg, Inter 600 11px uppercase letter-spacing 0.05em
                  color-text-tertiary, padding 8px 12px, 2px solid border-strong bottom
Row:              padding 11px 12px, 1px solid color-border-base bottom
                  last row: no border
Hover row:        background color-surface-subtle
Mono cells:       font-family JetBrains Mono 12px color-text-secondary
Action cell:      always last column, right-aligned, ghost buttons only
```

### 5.9 Empty States

Every empty state needs all three elements. No exceptions.

```
1. Illustration: simple SVG icon, color-text-disabled, 48px
2. Heading: Inter 600 16px color-text-primary — describe what's missing specifically
   (not "No results" but "No societies match your filters")
3. CTA: primary or ghost button — describe the action specifically
   (not "Add" but "List your society")
```

### 5.10 Loading Skeletons

```
Base:      color-surface-subtle background
Shimmer:   linear-gradient animation left-to-right, 1.5s ease-in-out infinite
           from color-surface-subtle via color-surface-inset back to color-surface-subtle
Shapes:    match the exact shape of the content they replace
           (a 3-column society card grid → 3 skeleton cards at the same size)
```

---

## 6. SIDEBAR NAVIGATION

### 6.1 Visual spec

```
Width:      220px desktop (collapses to icon-only at <1024px, hidden <768px)
Background: color-brand-navy (#0A1628)

Logo area:
  padding: 20px 16px 16px
  border-bottom: 1px solid rgba(255,255,255,0.08)
  Logo mark: 32px × 32px, color-brand-navy-mid bg, 8px radius, white "S" 700 weight
  Product name: Inter 700 16px white
  Sub-label: "VERIFIED MARKETPLACE" 10px uppercase rgba(255,255,255,0.4) letter-spacing 0.05em

Nav item:
  padding: 9px 10px
  border-radius: 7px
  font: Inter 500 13px rgba(255,255,255,0.55)
  icon: 16px, opacity 0.8
  gap between icon and label: 10px
  margin-bottom: 2px

Nav item hover:
  background: rgba(255,255,255,0.07)
  color: rgba(255,255,255,0.85)
  transition: 150ms ease

Nav item active:
  background: color-brand-navy-mid
  color: white
  icon: opacity 1

Footer / society badge:
  padding: 12px 8px
  border-top: 1px solid rgba(255,255,255,0.08)
  badge container: rgba(255,255,255,0.06) bg, 8px radius, 10px padding
  society name: Inter 600 12px white, overflow: ellipsis
  role label: 10px rgba(255,255,255,0.4)
```

---

## 7. MOTION & MICRO-INTERACTIONS

### 7.1 Motion philosophy

The actual premium-UI decisions are invariant across top products: interaction density and responsiveness, crafted microstates (hover, focus, disabled), and restraint in color. Most of what you can copy is process, not hex values.

Every animation in Sectoria is **functional** — it communicates state, not decoration.

### 7.2 Specific animations

```
Page transitions:      fade + translateY(4px) → (0px), 300ms ease-out
Card hover:            translateY(-2px) shadow-md, 200ms ease
Button press:          scale(0.98), 150ms ease
Status pill appear:    fade-in + scale(0.95 → 1), 200ms ease-out
Pending dot pulse:     opacity 1 → 0.4 → 1, 1.5s ease-in-out infinite
NADRA scan bar:        fixed height bar, top→bottom sweep, 1.5s linear infinite, repeating
Skeleton shimmer:      gradient sweep left→right, 1.5s ease-in-out infinite
Certificate stamp:     scale(1.1 → 1) + slight rotate(2deg → 0), 400ms ease-spring
Balloting spin:        translateY(0 → -4px) alternate, 0.4s ease-in-out infinite
Balloting result:      fade-in + scale(0.9 → 1), staggered 100ms per card
Tax recalculation:     numbers animate via counting (requestAnimationFrame), 300ms
Wizard step change:    slide-in from right (entering), slide-out to left (leaving), 250ms
Gauge fill (SVG):      stroke-dasharray animate from 0 to target, 800ms ease-out
Progress bar:          width animate, 500ms ease
Compliance check item: fade-in staggered 50ms per item on mount
```

### 7.3 Respect reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 8. SECTORIA-SPECIFIC DESIGN PATTERNS

### 8.1 Trust hierarchy — how to visually stack government credentials

Every verified entity follows this visual ordering:
```
Top tier (most trusted, shown first):
  PLRA Green Certificate → emerald heavy badge, shield icon
  NADRA CNIC Verified → navy badge, fingerprint icon

Second tier:
  LDA / CDA / RDA Registration → authority-specific color
  FBR Active Filer → forest green badge

Third tier (operational):
  Escrow Protected → amber badge, lock icon
  DNFBP Registered → blue badge
```

### 8.2 Pakistani data formatting — enforce everywhere

```typescript
// packages/ui/src/lib/format-pkr.ts
// "PKR 14,200,000" — always this format, never ₨ or Rs.
export function formatPKR(amount: number): string {
  return `PKR ${Math.round(amount).toLocaleString('en-PK')}`
}

// "35202-XXXXX-X" — masked CNIC
export function maskCnic(cnic: string): string {
  if (!cnic || cnic.length < 9) return cnic
  return cnic.substring(0, 5) + '-XXXXX-' + cnic.slice(-1)
}

// "12 Jun 2026" — always this date format, never MM/DD/YYYY
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })
}

// "5 Marla", "10 Marla", "1 Kanal" — always spelled out, never abbreviated
export function formatPlotSize(sizeSqft: number): string { ... }
```

### 8.3 The comparison engine — visual rules

```
Layout:       sticky header row (society names) + scrollable rows (attributes)
Row grouping: LDA Status / NOC / LOP in one group; pricing in another; payment plans in third
Best value:   emerald highlight on the numerically best cell per row
Null values:  "—" in color-text-disabled, never a blank cell
Mobile:       compare 2 societies max side-by-side; "add/remove" to swap
```

### 8.4 The booking wizard — visual rules

```
Progress:     5 numbered steps with connecting line
              done = emerald circle with checkmark
              active = navy filled circle
              todo = grey outlined circle
Line segment: done = emerald, pending = grey border
              width of line fills proportionally as steps complete (animated)

Step labels:  11px Inter 600 below each circle
              done = emerald text
              active = navy text
              todo = tertiary text

Content area: plain white card, no inner border
              each step fades in (300ms) and previous fades out
              no horizontal scroll, no swipe — explicit Next/Back buttons only
```

### 8.5 Compliance score gauge

```
SVG circle gauge, 110px × 110px
Background track: color-border-base, 10px stroke-width
Fill arc:
  score ≥ 80: color-success stroke
  score 50–79: color-warning stroke
  score < 50: color-danger stroke
Stroke-dasharray animates from 0 to (score/100 × circumference) on mount
Center text: score number Inter 800 20px, "/100" Inter 400 10px tertiary
```

---

## 9. ACCESSIBILITY STANDARDS

All of these are requirements, not goals:

```
Contrast:     WCAG AA minimum (4.5:1 text, 3:1 large text / graphical elements)
              Test every badge color, every table cell, every status text
Focus ring:   2px solid color-border-focus, 2px offset — visible on every interactive element
              Never remove outline — style it, but never set outline: none without an alternative
Keyboard:     Every interactive element reachable and operable via Tab + Enter + Space
Touch:        Minimum 44×44px touch target for all interactive elements
Color alone:  Never the only signal — always pair color with text or icon
              (badge = colored dot + colored text, not colored background only)
Motion:       All animations respect prefers-reduced-motion (Section 7.3)
Alt text:     All informational images have descriptive alt text
              Decorative images: alt=""
ARIA:         Loading states announce via aria-live="polite"
              Dialogs trap focus and have aria-modal="true"
              Status badges use role="status" where live-updating
```

---

## 10. WHAT NEVER TO DO IN SECTORIA

These are explicit bans — not style preferences, hard rules:

```
❌ No gradients on buttons (they date a product instantly)
❌ No drop shadows heavier than shadow-lg
❌ No colored backgrounds on sidebar nav items except the active state
❌ No decorative use of color — every color signals something
❌ No hardcoded hex values in component files — always a token from theme.css
❌ No font other than Inter and JetBrains Mono
❌ No border-radius values not in the token set
❌ No arbitrary spacing values — use the 4px-grid scale
❌ No animations faster than 150ms (feels broken) or slower than 600ms (feels sluggish)
❌ No fear-based microcopy ("Only 2 plots left!") — state urgency as fact, not pressure
❌ No more than 2 primary CTAs visible on any single screen
❌ No empty states without a CTA
❌ No full CNIC/NTN displayed outside explicitly authorized admin views
❌ No toast notifications for destructive / money-related actions — use a confirm dialog
❌ No placeholder text as a label — every field has a visible label above it
```
