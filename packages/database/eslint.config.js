import baseConfig from "@sectoria/config/eslint/base";

/** @type {import("eslint").Linter.Config[]} */
export default [
  // Prisma's generated client is not ours to lint.
  { ignores: ["src/generated/**", "node_modules/**"] },
  ...baseConfig,
  {
    // The seed script is an operational tool, not library code — progress
    // logging to stdout is expected and useful here.
    files: ["prisma/seed.ts"],
    rules: {
      "no-console": "off",
    },
  },
];
