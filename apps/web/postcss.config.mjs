/**
 * Tailwind CSS v4 is CSS-first — there is no `tailwind.config.ts`. The PostCSS
 * plugin compiles the `@theme` tokens declared in `@sectoria/ui/theme.css`
 * (imported once from `app/globals.css`) into utilities.
 */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
