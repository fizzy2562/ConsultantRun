import './style.css';
import { AppController } from './app/AppController';

declare global {
  interface Window {
    __consultantRunDebug?: {
      destroyApp: () => void;
      forceFinishRun: () => Promise<void>;
      forceSpawnObstacle: (key: string) => void;
      getState: () => unknown;
    };
  }
}

const appRoot = document.querySelector<HTMLDivElement>('#app');

if (!appRoot) {
  throw new Error('App root not found');
}

appRoot.innerHTML = `
  <div class="app-shell">
    <div class="background-orb orb-left"></div>
    <div class="background-orb orb-right"></div>
    <header class="brand-bar">
      <div class="brand-mark">
        <span class="brand-mark__dot"></span>
        <h1>ConsultantRun</h1>
      </div>
      <p class="brand-bar__copy">Agentforce World Tour Belgium 2026</p>
    </header>

    <main class="experience-shell">
      <section class="game-panel">
        <div id="phaser-root" class="game-panel__canvas"></div>
        <div id="overlay-root" class="overlay-root"></div>
      </section>
    </main>
  </div>
`;

const controller = new AppController({
  overlayRoot: document.querySelector<HTMLElement>('#overlay-root'),
  phaserRootId: 'phaser-root',
});

if (import.meta.env.DEV) {
  window.__consultantRunDebug = {
    destroyApp: () => controller.destroyForTest(),
    forceFinishRun: () => controller.forceFinishRunForTest(),
    forceSpawnObstacle: (key: string) => controller.forceSpawnObstacleForTest(key),
    getState: () => controller.getDebugState(),
  };
}

controller.init().catch((error) => {
  console.error(error);

  const overlayRoot = document.querySelector<HTMLElement>('#overlay-root');
  if (overlayRoot) {
    overlayRoot.innerHTML = `
      <section class="overlay-card overlay-card--error">
        <p class="eyebrow">ConsultantRun</p>
        <h2>Something blocked the launch</h2>
        <p>The app failed to start cleanly. Reload the page to retry.</p>
        <pre>${error instanceof Error ? error.message : 'Unknown error'}</pre>
      </section>
    `;
  }
});
