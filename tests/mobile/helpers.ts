import { expect, type Page } from '@playwright/test';

export interface PlaySceneDebugState {
  characterKey: string;
  instanceId: number;
  isGameOver: boolean;
  jumpCount: number;
  playerY: number | null;
  scoreText: string | null;
}

export interface AppDebugState {
  authMessage: string | null;
  isLoading: boolean;
  livesRemaining: number;
  pendingRunScore: number | null;
  playScene: PlaySceneDebugState | null;
  screen: 'menu' | 'character-select' | 'play' | 'result';
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

export async function startRun(page: Page, characterKey = 'runner-deloitte'): Promise<void> {
  await gotoCharacterSelect(page);
  await page.locator(`[data-key="${characterKey}"]`).click();
  await waitForScreen(page, 'play');
  await expect(page.locator('#phaser-root canvas')).toBeVisible();
}

export async function getDebugState(page: Page): Promise<AppDebugState> {
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
