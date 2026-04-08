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

test('top scores drawer opens from the mobile menu', async ({ page }) => {
  await page.goto('/?e2e=1');

  await expect(page.locator('#overlay-root')).toHaveAttribute('data-screen', 'menu');
  await page.locator('[data-action="toggle-leaderboard"]').click();

  await expect(page.getByRole('heading', { name: 'Top scores today' })).toBeVisible();
  await expect(page.locator('.leaderboard--drawer')).toBeVisible();
  await expect(page.locator('.leaderboard--drawer ol, .leaderboard--drawer .helper-copy')).toBeVisible();
});
