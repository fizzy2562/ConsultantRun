import './style.css';
import { AppController } from './app/AppController';

declare global {
  interface Window {
    __consultantRunDebug?: {
      destroyApp: () => void;
      forceFinishRun: () => void;
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
        <div>
          <p class="eyebrow">ConsultantCloud Event Microsite</p>
          <h1>ConsultantRun</h1>
        </div>
      </div>
      <p class="brand-bar__copy">Get the project live. Beat the room. Unlock your score.</p>
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
