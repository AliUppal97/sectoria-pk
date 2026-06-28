import type { Preview } from "@storybook/react-vite";
import "../src/theme.css";

const preview: Preview = {
  parameters: {
    layout: "padded",
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      // WCAG AA is a hard requirement (design spec §9), not advisory.
      test: "error",
    },
    backgrounds: {
      default: "surface",
      values: [
        { name: "surface", value: "#F7F8FA" },
        { name: "card", value: "#FFFFFF" },
        { name: "navy", value: "#0A1628" },
      ],
    },
  },
};

export default preview;
