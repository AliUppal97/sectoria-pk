import baseConfig from "@sectoria/config/eslint/base";

/** @type {import("eslint").Linter.Config[]} */
export default [
  {
    ignores: ["storybook-static/**"],
  },
  ...baseConfig,
];
