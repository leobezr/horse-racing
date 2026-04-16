import { expect, test } from "@playwright/test";

const cacheBustToken = process.env.STORYBOOK_CACHE_BUST ?? `${Date.now()}`;

const openStory = async ({
  page,
  storyId,
}: {
  page: Parameters<typeof test>[0]["page"];
  storyId: string;
}): Promise<void> => {
  await page.goto(`iframe.html?id=${storyId}&viewMode=story&cacheBust=${cacheBustToken}`);
  await page.waitForLoadState("domcontentloaded");
};

test("race canvas countdown snapshot", async ({ page }) => {
  await openStory({
    page,
    storyId: "race-organisms-racecanvasorganism--countdown-overlay",
  });

  const canvasWrap = page.locator('[data-test="app-race-canvas-wrap"]');
  await expect(canvasWrap).toBeVisible();
  await expect(canvasWrap).toHaveScreenshot("race-canvas-countdown.png");
});

test("race chips interactive snapshot", async ({ page }) => {
  await openStory({
    page,
    storyId: "race-organisms-racecontrolpanelorganism--chips-interactive",
  });

  const controls = page.locator('[data-test="app-race-controls"]');
  await expect(controls).toBeVisible();
  await expect(controls).toHaveScreenshot("race-controls-chips.png");
});
