# Sectoria.pk — Cursor Rules System

This is a complete `.cursor/rules/` setup for the Sectoria.pk
codebase, built to make Cursor behave like a senior engineer who already
knows this project's conventions — instead of re-explaining the stack,
the domain rules, and the security requirements in every new chat.

## Why this isn't a single `.cursorrules` file

The old single-file `.cursorrules` format is deprecated. Modern Cursor uses
a `.cursor/rules/` directory of `.mdc` files, each independently scoped, so
the right context loads only when it's actually relevant — instead of every
rule loading on every single request and quietly eating your context
window ("token tax"). A monolithic rules file that tries to cover tax law,
Tailwind conventions, and git commit style all at once either gets too
long to be useful or gets ignored.

## How to install this

Copy the `.cursor/` and `docs/` folders from this package into the root of
your actual project repository:

```
your-project/
├── .cursor/
│   └── rules/
│       ├── 000-core.mdc
│       ├── architecture.mdc
│       ├── oop-and-domain-modeling.mdc
│       ├── code-clarity-and-comments.mdc
│       ├── domain-logic.mdc
│       ├── verification-adapters.mdc
│       ├── database.mdc
│       ├── json-and-config-conventions.mdc
│       ├── api-trpc.mdc
│       ├── auth-and-access-control.mdc
│       ├── middleware-and-guards.mdc
│       ├── routing-and-navigation.mdc
│       ├── nextjs-app-router.mdc
│       ├── ui-design-system.mdc
│       ├── ui-ux-excellence.mdc
│       ├── security.mdc
│       ├── seo.mdc
│       ├── scalability-and-performance.mdc
│       ├── testing.mdc
│       ├── dependency-management.mdc
│       ├── documentation.mdc
│       └── git-workflow.mdc
├── .vscode/
│   └── extensions.json                    # recommended extension list, auto-prompts on open
├── docs/
│   └── architecture/
│       ├── dependency-baseline.md
│       └── access-rights-matrix.md
├── .cursorignore                          # excludes node_modules/.next/etc from Cursor indexing
├── .env.example                           # every required env var, placeholder values only
├── cspell.json                            # domain vocabulary dictionary (PLRA, NADRA, CNIC, etc.)
└── (your actual project files)
```

Commit `.cursor/rules/` to git — the entire point is that your whole team
(or future-you) gets the same AI behavior, not just whoever set it up locally.

## What each file covers

| File | Domain |
|---|---|
| `000-core.mdc` | Always-on non-negotiables (kept under ~150 words) |
| `architecture.mdc` | Monorepo package boundaries, where code should live |
| `oop-and-domain-modeling.mdc` | Classes, interfaces, enums, services, getters/setters, composition |
| `code-clarity-and-comments.mdc` | Naming, comment philosophy, function design, self-explanatory code |
| `domain-logic.mdc` | Tax, escrow, balloting, trust-score, ledger — pure business logic rules |
| `verification-adapters.mdc` | NADRA/FBR/DNFBP/PLRA adapter pattern |
| `database.mdc` | Prisma schema conventions, migrations, encrypted fields, append-only ledger |
| `json-and-config-conventions.mdc` | JSON file structure, schema validation, payload shapes |
| `api-trpc.mdc` | tRPC procedure structure, composition root rules, idempotency |
| `auth-and-access-control.mdc` | AuthN vs AuthZ, roles, resource ownership, guards, access rights matrix |
| `middleware-and-guards.mdc` | Request pipeline order, middleware composition, rate limiting placement |
| `routing-and-navigation.mdc` | URL structure, redirects/reroutes, deep linking, protected routes |
| `nextjs-app-router.mdc` | Next.js 16 specifics — async params, server/client component rules |
| `ui-design-system.mdc` | Tailwind v4 tokens, shadcn conventions, Storybook, status badge colors |
| `ui-ux-excellence.mdc` | Visual hierarchy, responsive design, the 5 required states, motion, accessibility, trust-specific UX patterns |
| `security.mdc` | Auth config, encryption, input validation, secrets, rate limiting, headers |
| `seo.mdc` | Metadata, structured data, sitemaps, rendering strategy, Core Web Vitals |
| `scalability-and-performance.mdc` | Query patterns, caching, background jobs, race conditions, when not to over-engineer |
| `testing.mdc` | Vitest/Playwright conventions, coverage expectations |
| `dependency-management.mdc` | Version pinning discipline, workspace catalog consistency |
| `documentation.mdc` | READMEs, TSDoc, ADRs, runbooks, Storybook requirement |
| `git-workflow.mdc` | Commit conventions, PR readiness checklist (manual invoke) |

## How the four activation modes are used here

| File | Mode | Why |
|---|---|---|
| `000-core.mdc` | **Always Apply** | Kept deliberately short (~150 words) — the only rule loaded on every single request, so it only contains the absolute non-negotiables. |
| `architecture.mdc`, `security.mdc`, `dependency-management.mdc`, `documentation.mdc`, `auth-and-access-control.mdc`, `scalability-and-performance.mdc` | **Agent Requested** (description, no globs) | Cursor decides to pull these in based on what the task is about — e.g., "design the booking authorization flow" triggers `auth-and-access-control.mdc` even though no file glob matches. |
| `domain-logic.mdc`, `verification-adapters.mdc`, `database.mdc`, `json-and-config-conventions.mdc`, `api-trpc.mdc`, `middleware-and-guards.mdc`, `routing-and-navigation.mdc`, `nextjs-app-router.mdc`, `ui-design-system.mdc`, `ui-ux-excellence.mdc`, `oop-and-domain-modeling.mdc`, `code-clarity-and-comments.mdc`, `seo.mdc`, `testing.mdc` | **Auto Attached** (globs) | Loads automatically the moment you open or edit a file matching its path pattern. `oop-and-domain-modeling.mdc` and `code-clarity-and-comments.mdc` use broad `**/*.ts`/`**/*.tsx` globs since they apply to nearly all code — kept lean enough that this is still cheap. |
| `git-workflow.mdc` | **Manual** (`@git-workflow`) | Deliberately not automatic — you invoke it explicitly when actually preparing a commit or PR, so it doesn't load during unrelated coding work. |

## What's deliberately NOT in here

- **No personal style preferences** (tabs vs spaces, quote style) — that's
  what your shared ESLint/Prettier config is for; rules files are for
  things a linter can't enforce (architectural boundaries, legal/business
  logic correctness, when to ask vs. proceed).
- **No secrets or environment-specific values** — these rules describe
  *how* to handle secrets, never contain one.

## Extending this as the project grows

When you add a genuinely new concern (e.g., a payments/Stripe-equivalent
integration, a mobile app package, an i18n layer), add a new focused
`.mdc` file rather than growing an existing one past a few hundred lines.
Cursor's own guidance is to keep individual rule files under roughly 500
lines and combined always-apply content under ~2,000 tokens — if a file
is approaching that, it's a sign it should split into two more specific rules.
