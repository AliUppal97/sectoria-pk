import nextConfig from "@sectoria/config/eslint/nextjs";

/** @type {import("eslint").Linter.Config[]} */
const config = [
  ...nextConfig,
  {
    ignores: [".next/**", "next-env.d.ts"],
  },
];

export default config;
