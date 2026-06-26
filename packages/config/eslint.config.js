import baseConfig from "./eslint/base.js";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...baseConfig,
  {
    files: ["**/*.js"],
    languageOptions: {
      sourceType: "module",
    },
  },
];
