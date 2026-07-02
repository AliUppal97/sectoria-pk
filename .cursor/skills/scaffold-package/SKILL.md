---
name: scaffold-package
description: Scaffold a new workspace package (pure domain logic or a shared library) under packages/ following Sectoria monorepo conventions — package.json, tsconfig, eslint, src/index.ts barrel, tests, README, and wiring. Use when creating a new package, splitting reusable logic out of apps/web or api-client, or when the user mentions a new domain/lib package.
disable-model-invocation: true
---

# Scaffold a Workspace Package

Create a new `packages/*` package that matches the repo's conventions exactly.
Template to copy from: `packages/domain/land`. Honors `architecture.mdc`,
`code-modularity-and-structure.mdc`, `domain-logic.mdc`, and
`dependency-management.mdc`.

## When to use

- Reusable pure logic is being duplicated or is too big to live in a route/router.
- A new bounded concern deserves its own independently-tested unit.
- The user asks for a "new package / library / domain module".

## Decide first

1. **Type:** `packages/domain/<name>` (pure business logic — zero I/O, zero
   framework imports) vs a generic shared lib package. Domain rules in
   `domain-logic.mdc` are stricter (purity + tests + TSDoc with `@see`).
2. **Name:** `@sectoria/<name>` (e.g. `@sectoria/domain-land`).
3. **Consumers:** if `apps/web` will import it, it must be added to
   `transpilePackages` in `apps/web/next.config.ts`.

## Steps

Copy this checklist and track it:

```
- [ ] Create package dir + files (package.json, tsconfig.json, eslint.config.js)
- [ ] src/index.ts barrel + src/<feature>.ts (one concern per file)
- [ ] src/__tests__/<feature>.test.ts (happy path + boundary + invalid input)
- [ ] README.md with a runnable usage example
- [ ] Add to transpilePackages in next.config.ts IF consumed by apps/web
- [ ] pnpm install, then pnpm --filter @sectoria/<name> test lint typecheck
```

### Files (mirror `packages/domain/land`)

`package.json` — keep deps in the version catalog (`catalog:`), never pin a
guessed version (`dependency-management.mdc`):

```json
{
  "name": "@sectoria/<name>",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": { ".": { "types": "./src/index.ts", "default": "./src/index.ts" } },
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": { "lint": "eslint .", "typecheck": "tsc --noEmit", "test": "vitest run" },
  "devDependencies": {
    "@sectoria/config": "workspace:*",
    "eslint": "catalog:",
    "typescript": "catalog:",
    "vitest": "catalog:"
  }
}
```

`tsconfig.json` extends `@sectoria/config/typescript/base`; `eslint.config.js`
spreads `@sectoria/config/eslint/base`. (Both shown verbatim in
`packages/domain/land`.)

`src/index.ts` is a **barrel** that re-exports the public API only — internal
files are not deep-imported across packages (`code-modularity-and-structure.mdc`).
Use explicit `.js` specifiers (NodeNext ESM):

```ts
export { doThing, AThing } from "./thing.js";
```

### Rules to respect while writing the code

- Domain packages: pure functions, plain data in/out, no `Date.now()`/
  `Math.random()` without an injected clock/seed, typed errors (not silent
  `null`/`0`), TSDoc with `@see` for legal refs. Write tests **before** the
  consumer.
- Money is integer rupees or decimal strings — never floats
  (`json-and-config-conventions.mdc`, `database.mdc`).
- Workspaces resolve via the `packages/*` glob in `pnpm-workspace.yaml`; no
  manual registration needed beyond a fresh `pnpm install`. Add a shared dep
  to the version catalog if it's new.

## Verify

Run `pnpm --filter @sectoria/<name> test lint typecheck`, then the repo gate
`pnpm turbo run test lint typecheck`. The package README must have a working
example before another package imports it (`architecture.mdc`).
