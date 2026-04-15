import { expect, test } from '@playwright/test';
import { cleanupApp, getDebugState, waitForScreen } from './helpers';

test.afterEach(async ({ page }) => {
  await cleanupApp(page);
});

test('authenticated pending results auto-unlock after reload recovery', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'consultantrun:event-session',
      JSON.stringify({
        anonymousSessionId: 'session-1',
        createdAt: new Date().toISOString(),
        eventName: 'Agentforce Belgium 2026',
        utm: { utmSource: null, utmMedium: null, utmCampaign: null, utmContent: null },
        userAgent: navigator.userAgent,
      })
    );
    localStorage.setItem(
      'consultantrun:auth-user',
      JSON.stringify({
        id: 'user-1',
        email: 'player@example.com',
        displayName: 'player',
        provider: 'demo',
      })
    );
    localStorage.setItem(
      'consultantrun:pending-run',
      JSON.stringify({
        id: 'run-1',
        createdAt: new Date().toISOString(),
        score: 187,
        distance: 642,
        durationMs: 18700,
        stageReached: 'Design',
        obstacleClears: 4,
        characterKey: 'runner-deloitte',
        displayName: 'player@example.com',
      })
    );
  });

  await page.goto('/?e2e=1');
  await waitForScreen(page, 'result');
  await page.waitForFunction(() => {
    const state = window.__consultantRunDebug?.getState() as { submittedScore?: number | null } | undefined;
    return (state?.submittedScore ?? 0) > 0;
  });

  const state = await getDebugState(page);
  expect(state.submittedScore).toBe(187);
  expect(state.pendingRunScore).toBeNull();
  await expect(page.locator('#overlay-root')).toContainText('Your score is on the leaderboard');
  await expect(page.locator('#overlay-root')).toContainText('Clean clears');
  await expect(page.locator('#overlay-root')).toContainText('4');
  await expect(page.locator('[data-action="sign-out"]')).toBeVisible();
  await expect(page.locator('#overlay-root')).not.toContainText('player@example.com');
});

test('stale event sessions are replaced when the configured event changes', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'consultantrun:event-session',
      JSON.stringify({
        anonymousSessionId: 'stale-session',
        createdAt: '2025-01-01T00:00:00.000Z',
        eventName: 'Old Event Name',
        utm: { utmSource: 'legacy', utmMedium: null, utmCampaign: null, utmContent: null },
        userAgent: 'legacy-agent',
      })
    );
  });

  await page.goto('/?e2e=1');
  await waitForScreen(page, 'menu');

  const session = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('consultantrun:event-session') ?? 'null')
  );

  expect(session.eventName).toBe('Agentforce Belgium 2026');
  expect(session.anonymousSessionId).not.toBe('stale-session');
});

test('failed unlocks stay on the result screen with a visible retry path', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'consultantrun:event-session',
      JSON.stringify({
        anonymousSessionId: 'session-2',
        createdAt: new Date().toISOString(),
        eventName: 'Agentforce Belgium 2026',
        utm: { utmSource: null, utmMedium: null, utmCampaign: null, utmContent: null },
        userAgent: navigator.userAgent,
      })
    );
    localStorage.setItem(
      'consultantrun:auth-user',
      JSON.stringify({
        id: 'user-2',
        email: 'retry@example.com',
        displayName: 'retry',
        provider: 'demo',
      })
    );
    localStorage.setItem(
      'consultantrun:pending-run',
      JSON.stringify({
        id: 'run-2',
        createdAt: new Date().toISOString(),
        score: 0,
        distance: 0,
        durationMs: 0,
        stageReached: 'Discovery',
        obstacleClears: 0,
        characterKey: 'runner-spire',
        displayName: 'retry@example.com',
      })
    );
  });

  await page.goto('/?e2e=1');
  await waitForScreen(page, 'result');

  const state = await getDebugState(page);
  expect(state.submittedScore).toBeNull();
  expect(state.pendingRunScore).toBe(0);
  await expect(page.locator('#overlay-root')).toContainText('Run data is incomplete');
  await expect(page.locator('[data-action="replay"]')).toBeVisible();
});
