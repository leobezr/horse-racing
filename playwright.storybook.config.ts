import { defineConfig, devices } from "@playwright/test";

const useRemoteBaseUrl = Boolean(process.env.BASE_URL);

export default defineConfig({
  testDir: "tests/storybook",
  timeout: 30000,
  expect: {
    timeout: 5000,
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      animations: "disabled",
      caret: "hide",
    },
  },
  use: {
    baseURL: process.env.BASE_URL ?? "http://127.0.0.1:6006",
    trace: "retain-on-failure",
    viewport: { width: 1280, height: 900 },
  },
  webServer: useRemoteBaseUrl
    ? undefined
    : {
        command: "yarn storybook:build && npx http-server storybook-static -p 6006 -s",
        url: "http://127.0.0.1:6006",
        reuseExistingServer: true,
        timeout: 120000,
      },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
});
