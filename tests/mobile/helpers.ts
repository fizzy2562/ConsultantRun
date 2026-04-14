import { expect, type Page } from '@playwright/test';

export interface PlaySceneDebugState {
  characterKey: string;
  currentStage: string;
  instanceId: number;
  isGameOver: boolean;
  jumpCount: number;
  obstacle: {
    cropHeight: number;
    cropWidth: number;
    displayHeight: number;
    displayWidth: number;
    key: string;
    targetHeight: number;
    targetWidth: number;
  } | null;
  playerY: number | null;
  scoreText: string | null;
}

export interface AppDebugState {
  authMessage: string | null;
  isLoading: boolean;
  livesRemaining: number;
  pendingRunScore: number | null;
  playScene: PlaySceneDebugState | null;
  rendererType: string;
  screen: 'menu' | 'character-select' | 'name-entry' | 'play' | 'result';
  selectedCharacter: string;
  submittedScore: number | null;
}

export async function waitForScreen(
  page: Page,
  screen: AppDebugState['screen'],
): Promise<void> {
  await expect(page.locator('#overlay-root')).toHaveAttribute('data-screen', screen);
}

export async function gotoCharacterSelect(page: Page): Promise<void> {
  await page.goto('/?e2e=1');
  await waitForScreen(page, 'menu');
  await page.locator('[data-action="play"]').click();
  await waitForScreen(page, 'character-select');
}

export async function startRun(
  page: Page,
  characterKey = 'runner-deloitte',
  displayName = 'Consultant',
): Promise<void> {
  await gotoCharacterSelect(page);
  await page.locator(`[data-key="${characterKey}"]`).click();
  await waitForScreen(page, 'name-entry');

  if (displayName) {
    await page.locator('form[data-action="name-entry"] input[name="name"]').fill(displayName);
  }

  await page.locator('form[data-action="name-entry"] button[type="submit"]').click();
  await waitForScreen(page, 'play');
  await expect(page.locator('#phaser-root canvas')).toBeVisible();
}

export async function getDebugState(page: Page): Promise<AppDebugState> {
  await page.waitForFunction(() => Boolean(window.__consultantRunDebug?.getState), null, {
    timeout: 10_000,
  });
  const state = await page.evaluate(() => window.__consultantRunDebug?.getState() ?? null);

  if (!state) {
    throw new Error('ConsultantRun debug hook is unavailable. Run tests against the Vite dev server.');
  }

  return state as AppDebugState;
}

export async function cleanupApp(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.__consultantRunDebug?.destroyApp();
  }).catch(() => undefined);

  await page.goto('about:blank').catch(() => undefined);
}

export async function forceSpawnObstacle(page: Page, key: string): Promise<void> {
  await page.evaluate((obstacleKey) => {
    window.__consultantRunDebug?.forceSpawnObstacle(obstacleKey);
  }, key);
}

export async function forceFinishLife(page: Page): Promise<void> {
  const before = await getDebugState(page);
  const previousInstanceId = before.playScene?.instanceId ?? 0;

  await page.evaluate(() => {
    void window.__consultantRunDebug?.forceFinishRun();
  });

  await page.waitForFunction(
    (instanceId) => {
      const state = window.__consultantRunDebug?.getState() as
        | {
            playScene?: { instanceId?: number };
            screen?: 'menu' | 'character-select' | 'name-entry' | 'play' | 'result';
          }
        | undefined;

      return (
        state?.screen === 'result' ||
        (state?.screen === 'play' && (state.playScene?.instanceId ?? 0) > Number(instanceId))
      );
    },
    previousInstanceId,
    { timeout: 10_000 }
  );
}
