import { fileURLToPath, URL } from "node:url";
import { mergeConfig } from "vite";
import vuetify from "vite-plugin-vuetify";
import type { StorybookConfig } from "@storybook/vue3-vite";

const resolveStorybookBasePath = (): string | undefined => {
  const rawBasePath = process.env.STORYBOOK_BASE_PATH;
  if (!rawBasePath) {
    return undefined;
  }

  const withLeadingSlash = rawBasePath.startsWith("/")
    ? rawBasePath
    : `/${rawBasePath}`;

  if (withLeadingSlash.endsWith("/")) {
    return withLeadingSlash;
  }

  return `${withLeadingSlash}/`;
};

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx|js|jsx|mjs)"],
  addons: [
    "@storybook/addon-links",
    "@storybook/addon-essentials",
    "@storybook/addon-interactions",
  ],
  framework: {
    name: "@storybook/vue3-vite",
    options: {},
  },
  docs: {
    autodocs: "tag",
  },
  viteFinal: async (viteConfig) => {
    const basePath = resolveStorybookBasePath();

    return mergeConfig(viteConfig, {
      base: basePath,
      plugins: [
        vuetify({
          autoImport: true,
        }),
      ],
      resolve: {
        alias: {
          "@": fileURLToPath(new URL("../src", import.meta.url)),
        },
      },
    });
  },
};

export default config;
