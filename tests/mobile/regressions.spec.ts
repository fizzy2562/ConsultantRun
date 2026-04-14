import { expect, test, type Page } from '@playwright/test';
import {
  cleanupApp,
  forceSpawnObstacle,
  getDebugState,
  startRun,
  waitForScreen,
} from './helpers';

test.afterEach(async ({ page }) => {
  await cleanupApp(page);
});

async function finishRunWithScore(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const state = window.__consultantRunDebug?.getState() as { playScene?: { scoreText?: string | null } } | undefined;
    return state?.playScene?.scoreText !== '000';
  });

  await page.evaluate(() => window.__consultantRunDebug?.forceFinishRun());
}

test('email-style player names are never shown in the result or leaderboard', async ({ page }) => {
  await startRun(page, 'runner-deloitte', 'qa@example.com');

  await finishRunWithScore(page);
  await finishRunWithScore(page);
  await finishRunWithScore(page);
  await waitForScreen(page, 'result');

  await page.locator('input[name="email"]').fill('player@example.com');
  await page.locator('form[data-action="magic-link"] button[type="submit"]').click();

  await page.waitForFunction(() => {
    const state = window.__consultantRunDebug?.getState() as { submittedScore?: number | null } | undefined;
    return Boolean(state?.submittedScore);
  });

  await expect(page.locator('#overlay-root')).not.toContainText('qa@example.com');
  await expect(page.locator('.leaderboard__name').first()).not.toContainText('@');
  await expect(page.locator('.leaderboard__name').first()).toHaveText('Consultant');
});

test('a pending result survives reload and replay starts a fresh run with the same sponsor', async ({ page }) => {
  await startRun(page, 'runner-delaware', 'Consultant');

  await finishRunWithScore(page);
  await finishRunWithScore(page);
  await finishRunWithScore(page);
  await waitForScreen(page, 'result');

  await page.reload();
  await waitForScreen(page, 'result');

  await expect(page.locator('[data-action="replay"]')).toBeVisible();
  await expect(page.locator('.stat-card__value').first()).not.toHaveText('0');
  await page.locator('[data-action="replay"]').click();
  await waitForScreen(page, 'play');

  const state = await getDebugState(page);
  expect(state.selectedCharacter).toBe('runner-delaware');
  expect(state.livesRemaining).toBe(3);
  expect(state.pendingRunScore).toBeNull();
  expect(state.playScene?.characterKey).toBe('runner-delaware');
  expect(state.playScene?.isGameOver).toBe(false);
});

test('obstacle art is cropped and scaled to cover its intended render box', async ({ page }) => {
  await startRun(page);
  await forceSpawnObstacle(page, 'missing-reqs');

  await page.waitForFunction(() => {
    const state = window.__consultantRunDebug?.getState() as {
      playScene?: { obstacle?: { key?: string } | null };
    } | undefined;
    return state?.playScene?.obstacle?.key === 'missing-reqs';
  });

  const state = await getDebugState(page);
  const obstacle = state.playScene?.obstacle;

  expect(obstacle).not.toBeNull();
  expect(obstacle?.cropWidth).toBeGreaterThan(obstacle?.targetWidth ?? 0);
  expect(obstacle?.displayWidth).toBeGreaterThan(obstacle?.targetWidth ?? 0);
  expect(obstacle?.displayHeight).toBeCloseTo(obstacle?.targetHeight ?? 0, 0);
});
