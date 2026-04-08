import { expect, test } from '@playwright/test';
import { cleanupApp, getDebugState, startRun, waitForScreen } from './helpers';

test.afterEach(async ({ page }) => {
  await cleanupApp(page);
});

test('mobile tap on the canvas triggers a jump', async ({ page }) => {
  await startRun(page);

  await page.waitForFunction(() => {
    const state = window.__consultantRunDebug?.getState() as { playScene?: { jumpCount?: number } } | undefined;
    return state?.playScene?.jumpCount === 0;
  });

  const before = await getDebugState(page);
  const canvas = page.locator('#phaser-root canvas');
  const box = await canvas.boundingBox();

  if (!box) {
    throw new Error('Game canvas is not available for tapping.');
  }

  for (let attempt = 0; attempt < 4; attempt += 1) {
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(120);

    const current = await getDebugState(page);
    if ((current.playScene?.jumpCount ?? 0) > (before.playScene?.jumpCount ?? 0)) {
      break;
    }
  }

  const after = await getDebugState(page);
  expect(after.playScene?.jumpCount).toBeGreaterThan(before.playScene?.jumpCount ?? 0);
});

test('mobile replay returns the player to sponsor select after a result', async ({ page }) => {
  await startRun(page, 'runner-delaware');

  await page.evaluate(() => window.__consultantRunDebug?.forceFinishRun());
  await waitForScreen(page, 'result');

  await page.locator('[data-action="replay"]').click();
  await waitForScreen(page, 'character-select');

  const state = await getDebugState(page);
  expect(state.selectedCharacter).toBe('runner-delaware');
});
