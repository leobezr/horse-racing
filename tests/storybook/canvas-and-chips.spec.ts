import { expect, test } from "@playwright/test";

const openStory = async ({
  page,
  storyId,
}: {
  page: Parameters<typeof test>[0]["page"];
  storyId: string;
}): Promise<void> => {
  await page.goto(`/?path=/story/${storyId}`);
  await page.waitForSelector('[data-test="app-race-canvas-wrap"], [data-test="app-race-controls"]');
};

test("race canvas countdown snapshot", async ({ page }) => {
  await openStory({
    page,
    storyId: "race-organisms-racecanvasorganism--countdownoverlay",
  });

  const canvasWrap = page.locator('[data-test="app-race-canvas-wrap"]');
  await expect(canvasWrap).toBeVisible();
  await expect(canvasWrap).toHaveScreenshot("race-canvas-countdown.png");
});

test("race chips interactive snapshot", async ({ page }) => {
  await openStory({
    page,
    storyId: "race-organisms-racecontrolpanelorganism--chipsinteractive",
  });

  const controls = page.locator('[data-test="app-race-controls"]');
  await expect(controls).toBeVisible();
  await expect(controls).toHaveScreenshot("race-controls-chips.png");
});
