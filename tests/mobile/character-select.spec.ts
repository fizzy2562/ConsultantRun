import { expect, test } from '@playwright/test';
import { cleanupApp, gotoCharacterSelect } from './helpers';

test.afterEach(async ({ page }) => {
  await cleanupApp(page);
});

test('character select remains scrollable on mobile and lower sponsors are reachable', async ({
  page,
}) => {
  await gotoCharacterSelect(page);

  const overlay = page.locator('#overlay-root');
  const metrics = await overlay.evaluate((node) => {
    const element = node as HTMLElement;
    const computed = window.getComputedStyle(element);

    return {
      clientHeight: element.clientHeight,
      overflowY: computed.overflowY,
      scrollHeight: element.scrollHeight,
    };
  });

  expect(metrics.overflowY).toBe('auto');
  expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight);

  await overlay.evaluate((node) => {
    const element = node as HTMLElement;
    element.scrollTop = element.scrollHeight;
  });

  const lastSponsor = page.locator('[data-key="runner-nrb"]');
  await expect(lastSponsor).toBeVisible();
  await expect(lastSponsor).toBeEnabled();
});

test('top scores list is visible on the mobile menu without opening a drawer', async ({ page }) => {
  await page.goto('/?e2e=1');

  await expect(page.locator('#overlay-root')).toHaveAttribute('data-screen', 'menu');
  await expect(page.locator('[data-action="toggle-leaderboard"]')).toHaveCount(0);
  await expect(page.locator('.leaderboard--mobile')).toBeVisible();
  await expect(page.locator('.leaderboard--mobile h3')).toContainText(/Can you top this\?|Target pace for today/);
  await expect(page.locator('.hero-stats .hero-stat')).toHaveCount(3);
  await expect(page.locator('.leaderboard--mobile')).toContainText(/Fast Lane|Pipeline Pro|Solution Sprint/);
});
