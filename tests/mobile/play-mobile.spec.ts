import { expect, test } from '@playwright/test';
import { cleanupApp, forceFinishLife, getDebugState, startRun, waitForScreen } from './helpers';

test.afterEach(async ({ page }) => {
  await cleanupApp(page);
});

test('webkit mobile runs with the canvas renderer for stability', async ({ page, browserName }) => {
  await startRun(page);
  const state = await getDebugState(page);

  if (browserName === 'webkit') {
    expect(state.rendererType).toBe('canvas');
  } else {
    expect(['auto', 'canvas']).toContain(state.rendererType);
  }

  expect(state.playScene?.currentStage).toBe('Discovery');
});

test('mobile tap on the canvas triggers a jump', async ({ page }) => {
  await startRun(page);
  await expect(page.locator('.play-hud')).toContainText('Run 1 of 3');
  await expect(page.locator('.play-hint')).toContainText('Find the rhythm');

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

test('mobile replay restarts the game with the same sponsor after a result', async ({ page }) => {
  await startRun(page, 'runner-delaware');

  // The debug helper waits until the app has either restarted into a new run
  // or reached the result state, so each call consumes exactly one life.
  await forceFinishLife(page);
  await forceFinishLife(page);
  await forceFinishLife(page);
  await waitForScreen(page, 'result');

  await page.locator('[data-action="replay"]').click();
  await waitForScreen(page, 'play');

  const state = await getDebugState(page);
  expect(state.selectedCharacter).toBe('runner-delaware');
  expect(state.livesRemaining).toBe(3);
  expect(state.playScene?.characterKey).toBe('runner-delaware');
  expect(state.playScene?.isGameOver).toBe(false);
  await expect(page.locator('.play-hud')).toContainText('Run 1 of 3');
});
