# @sectoria/config

**Shared toolchain presets** for the monorepo: ESLint flat configs and TypeScript
`extends` bases. Apps and packages import these paths instead of duplicating
lint/tsconfig rules.

## What this package is — and is not

- **Is:** ESLint and TypeScript configuration consumed via `package.json`
  `extends` / `eslint.config.js` imports.
- **Is not:** runtime application code, env validation, or design tokens
  (those live in `apps/web`, `packages/types`, and `packages/ui` respectively).

## Usage

Extend the shared TypeScript base in a package `tsconfig.json`:

```json
{
  "extends": "@sectoria/config/typescript/base",
  "compilerOptions": {
    "outDir": "dist"
  },
  "include": ["src"]
}
```

Next.js apps use the Next.js preset:

```json
{
  "extends": "@sectoria/config/typescript/nextjs",
  "include": ["**/*.ts", "**/*.tsx", ".next/types/**/*.ts"]
}
```

Wire ESLint from the repo root or an app `eslint.config.js`:

```js
import baseConfig from "@sectoria/config/eslint/base";
import nextjsConfig from "@sectoria/config/eslint/nextjs";

export default [...baseConfig, ...nextjsConfig];
```

React libraries (e.g. `packages/ui`) use `@sectoria/config/typescript/react-library`.

## Exports

| Path | Purpose |
|---|---|
| `@sectoria/config/eslint/base` | Shared ESLint flat config |
| `@sectoria/config/eslint/nextjs` | Next.js App Router additions |
| `@sectoria/config/typescript/base` | Strict TS baseline |
| `@sectoria/config/typescript/nextjs` | Next.js + path aliases |
| `@sectoria/config/typescript/react-library` | React component packages |

When adding a new workspace package, start from these presets — do not fork
rules locally unless the change should apply monorepo-wide.
