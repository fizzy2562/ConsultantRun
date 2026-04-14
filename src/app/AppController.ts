import Phaser from 'phaser';
import { eventConfig } from '../config/event';
import { characters } from '../config/game';
import { createGame } from '../game/createGame';
import { getActiveCharacter, setActiveCharacter } from '../game/systems/characterStore';
import { PlayScene } from '../game/scenes/PlayScene';
import { audioSystem } from '../game/systems/AudioSystem';
import { authService } from '../services/auth';
import { trackEvent } from '../services/analytics';
import { sanitizeDisplayName } from '../services/displayName';
import { createOrRestoreEventSession } from '../services/eventSession';
import { leaderboardService } from '../services/leaderboard';
import {
  clearPendingRun,
  getPendingRun,
  getStoredDisplayName,
  saveStoredDisplayName,
  savePendingRun,
} from '../services/storage';
import type {
  AuthMethod,
  EventSessionContext,
  LeaderboardEntry,
  PendingRun,
  RoleIntent,
  UserIdentity,
} from '../types/app';

const TOTAL_LIVES = 3;

const stageDescriptions: Record<string, string> = {
  Discovery: 'You got the brief moving, but the room still wants more clarity.',
  Design: 'Momentum is building. Stakeholders can see the shape of the solution.',
  Build: 'The team is shipping. Keep your rhythm and protect the runway.',
  UAT: 'You are in the danger zone now. One wobble and the whole launch shakes.',
  'Go Live': 'That is the clean launch run. You made it through the blockers.',
};

interface AppControllerOptions {
  overlayRoot: HTMLElement | null;
  phaserRootId: string;
}

interface ViewState {
  screen: 'menu' | 'character-select' | 'name-entry' | 'play' | 'result';
  selectedCharacter: string;
  displayName: string;
  livesRemaining: number;
  bestPendingRun: PendingRun | null;
  isLeaderboardOpen: boolean;
  session: EventSessionContext | null;
  pendingRun: PendingRun | null;
  submittedScore: LeaderboardEntry | null;
  user: UserIdentity | null;
  authMethod: AuthMethod | null;
  authMessage: string | null;
  dailyLeaderboard: LeaderboardEntry[];
  allTimeLeaderboard: LeaderboardEntry[];
  myBest: LeaderboardEntry | null;
  loading: boolean;
  roleIntent: RoleIntent | null;
}

const characterByKey = new Map(characters.map((c) => [c.key, c]));

function toHex(value: number): string {
  return `#${value.toString(16).padStart(6, '0')}`;
}

function renderLivesDots(remaining: number, total: number): string {
  return Array.from({ length: total })
    .map((_, i) => `<span class="lives-dot${i < remaining ? ' lives-dot--active' : ''}"></span>`)
    .join('');
}

function renderCompanyBadge(characterKey: string | null | undefined): string {
  if (!characterKey) {
    return '';
  }

  const character = characterByKey.get(characterKey);

  if (!character) {
    return `
      <span class="leaderboard__company">
        <span class="leaderboard__logo leaderboard__logo--fallback">${escapeHtml(characterKey)}</span>
        <span class="leaderboard__company-name">${escapeHtml(characterKey)}</span>
      </span>
    `;
  }

  return `
    <span class="leaderboard__company">
      <span
        class="leaderboard__logo"
        style="background:${escapeHtml(toHex(character.palette.body))};color:${escapeHtml(toHex(character.palette.accent))};border-color:${escapeHtml(toHex(character.palette.accent))};"
      >
        ${escapeHtml(character.logoMark)}
      </span>
      <span class="leaderboard__company-name">${escapeHtml(character.label)}</span>
    </span>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatLeaderboard(entries: LeaderboardEntry[]): string {
  if (!entries.length) {
    return '<p class="helper-copy">No scores yet. Be first.</p>';
  }

  return `
    <ol>
      ${entries
        .map(
          (entry) => `
            <li>
              <span class="leaderboard-rank">#${entry.rank}</span>
              <div class="leaderboard__meta">
                <span class="leaderboard__name">${escapeHtml(sanitizeDisplayName(entry.displayName))}</span>
                ${renderCompanyBadge(entry.characterKey)}
                <span class="leaderboard__subline">${escapeHtml(entry.stageReached)} · Top ${entry.percentile}% today</span>
              </div>
              <span class="leaderboard__score">${entry.score}</span>
            </li>
          `
        )
        .join('')}
    </ol>
  `;
}

function buildSampleLeaderboard(): LeaderboardEntry[] {
  return [
    {
      id: 'sample-1',
      createdAt: new Date().toISOString(),
      anonymousSessionId: 'sample',
      userId: null,
      displayName: 'Fast Lane',
      score: 1420,
      stageReached: 'Go Live',
      distance: 0,
      eventName: eventConfig.eventName,
      prizeStatus: 'preview',
      authMethod: null,
      characterKey: 'runner-deloitte',
      rank: 1,
      percentile: 5,
    },
    {
      id: 'sample-2',
      createdAt: new Date().toISOString(),
      anonymousSessionId: 'sample',
      userId: null,
      displayName: 'Pipeline Pro',
      score: 1180,
      stageReached: 'UAT',
      distance: 0,
      eventName: eventConfig.eventName,
      prizeStatus: 'preview',
      authMethod: null,
      characterKey: 'runner-spire',
      rank: 2,
      percentile: 12,
    },
    {
      id: 'sample-3',
      createdAt: new Date().toISOString(),
      anonymousSessionId: 'sample',
      userId: null,
      displayName: 'Solution Sprint',
      score: 940,
      stageReached: 'Build',
      distance: 0,
      eventName: eventConfig.eventName,
      prizeStatus: 'preview',
      authMethod: null,
      characterKey: 'runner-delaware',
      rank: 3,
      percentile: 20,
    },
  ];
}

function getScoreMood(score: number): { badge: string; title: string } {
  if (score >= 1080) {
    return { badge: 'Launch legend', title: 'You shipped a clean go-live run.' };
  }

  if (score >= 760) {
    return { badge: 'Pressure player', title: 'You were one clean sprint away from launch.' };
  }

  if (score >= 420) {
    return { badge: 'Builder energy', title: 'You got through the messy middle with pace.' };
  }

  if (score >= 180) {
    return { badge: 'Discovery spark', title: 'You found your rhythm. Next run goes deeper.' };
  }

  return { badge: 'Warm-up lap', title: 'The first run is for reading the room. Go again.' };
}

function buildCtaUrl(baseUrl: string, params: Record<string, string | number | null | undefined>): string {
  try {
    const url = new URL(baseUrl);

    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }

    return url.toString();
  } catch {
    return baseUrl;
  }
}

export class AppController {
  private overlayRoot: HTMLElement;

  private game: Phaser.Game;

  private isUnlockingPendingRun = false;

  private state: ViewState = {
    screen: 'menu',
    selectedCharacter: characters[0].key,
    displayName: '',
    livesRemaining: TOTAL_LIVES,
    bestPendingRun: null,
    isLeaderboardOpen: false,
    session: null,
    pendingRun: null,
    submittedScore: null,
    user: null,
    authMethod: null,
    authMessage: null,
    dailyLeaderboard: [],
    allTimeLeaderboard: [],
    myBest: null,
    loading: true,
    roleIntent: null,
  };

  constructor(options: AppControllerOptions) {
    if (!options.overlayRoot) {
      throw new Error('Overlay root is missing.');
    }

    this.overlayRoot = options.overlayRoot;
    this.game = createGame(options.phaserRootId);
  }

  async init(): Promise<void> {
    this.bindEvents();
    this.state.session = await createOrRestoreEventSession();
    this.state.user = await authService.restoreSession();
    this.state.authMethod = authService.getMethod();
    this.state.pendingRun = getPendingRun();

    if (this.state.pendingRun?.characterKey) {
      this.state.selectedCharacter = this.state.pendingRun.characterKey;
      setActiveCharacter(this.state.pendingRun.characterKey);
    } else {
      const stored = getActiveCharacter();
      this.state.selectedCharacter = stored;
    }

    // Restore display name — persists across replays on personal phones
    this.state.displayName = getStoredDisplayName() ?? '';

    await this.refreshLeaderboards();

    if (this.state.pendingRun) {
      await this.resumePendingRun();
      return;
    }

    this.state.loading = false;
    this.showMenu();
  }

  private bindEvents(): void {
    this.overlayRoot.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const actionable = target.closest<HTMLElement>('[data-action]');

      if (!actionable) {
        return;
      }

      const action = actionable.dataset.action;
      audioSystem.unlock();
      audioSystem.play('cta');

      if (action === 'play') {
        this.openCharacterSelect();
        return;
      }

      // Replay: reset lives and restart immediately with the same sponsor and name
      if (action === 'replay') {
        this.state.livesRemaining = TOTAL_LIVES;
        this.state.bestPendingRun = null;
        this.state.pendingRun = null;
        clearPendingRun();
        void this.startPlay();
        return;
      }

      if (action === 'select-character') {
        const key = actionable.dataset.key;
        if (key) {
          this.state.selectedCharacter = key;
          setActiveCharacter(key);
          this.openNameEntry();
        }
        return;
      }

      if (action === 'start-run') {
        void this.startPlay();
        return;
      }

      if (action === 'auth-google') {
        void this.handleGoogleSignIn();
        return;
      }

      if (action === 'toggle-mute') {
        audioSystem.toggleMute();
        this.render();
        return;
      }

      if (action === 'toggle-leaderboard') {
        this.state.isLeaderboardOpen = !this.state.isLeaderboardOpen;
        this.render();
        return;
      }

      if (action === 'select-role') {
        this.state.roleIntent = actionable.dataset.role as RoleIntent;
        this.render();
        return;
      }

      if (action === 'sign-out') {
        void authService.signOut().then(async () => {
          this.state.user = null;
          this.state.authMethod = null;
          this.state.submittedScore = null;
          await this.refreshLeaderboards();
          this.render();
        });
        return;
      }

      if (action === 'product-cta') {
        trackEvent('consultantcloud_cta_clicked', {
          role_intent: this.state.roleIntent,
          score: this.state.submittedScore?.score ?? null,
        });
      }
    });

    this.overlayRoot.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement;
      event.preventDefault();

      if (form.dataset.action === 'name-entry') {
        const raw = new FormData(form).get('name');
        const name = typeof raw === 'string' ? raw.trim() : '';
        this.state.displayName = sanitizeDisplayName(name);
        saveStoredDisplayName(this.state.displayName);
        void this.startPlay();
        return;
      }

      if (form.dataset.action === 'magic-link') {
        void this.handleMagicLink(new FormData(form).get('email'));
      }
    });

    authService.onChange((user, method) => {
      this.state.user = user;
      this.state.authMethod = method;

      if (user && this.state.pendingRun) {
        void this.unlockPendingRun();
        return;
      }

      this.render();
    });

    this.game.events.on('run-ended', (pendingRun: PendingRun) => {
      void this.handleRunEnded(pendingRun);
    });
  }

  private async startPlay(): Promise<void> {
    this.state.screen = 'play';
    this.state.isLeaderboardOpen = false;
    this.state.authMessage = null;
    this.state.submittedScore = null;
    this.state.pendingRun = null;
    this.state.bestPendingRun = null;
    clearPendingRun();
    this.render();
    setActiveCharacter(this.state.selectedCharacter);
    trackEvent('play_clicked', { character: this.state.selectedCharacter });
    this.game.scene.start('PlayScene', {
      characterKey: this.state.selectedCharacter,
      displayName: this.state.displayName,
    });
  }

  private async resumePendingRun(): Promise<void> {
    const pendingRun = this.state.pendingRun;

    if (!pendingRun) {
      return;
    }

    this.state.screen = 'result';
    this.state.isLeaderboardOpen = false;
    this.state.loading = false;
    this.state.submittedScore = null;
    this.state.authMessage = null;
    this.game.scene.start('ResultScene', { pendingRun });

    if (this.state.user) {
      await this.unlockPendingRun();
      return;
    }

    this.render();
  }

  private async handleRunEnded(pendingRun: PendingRun): Promise<void> {
    // Track the run with the highest score across all lives
    if (!this.state.bestPendingRun || pendingRun.score > this.state.bestPendingRun.score) {
      this.state.bestPendingRun = pendingRun;
    }

    this.state.livesRemaining -= 1;

    if (this.state.livesRemaining > 0) {
      // Hold the current overlay state during the fail animation, then start the new scene.
      // Only re-render (updating the lives dots) after PlayScene.start() so the DOM's
      // data-screen attribute transitions to 'play' at the same moment the new scene is
      // actually active — keeping controller state and Phaser scene in sync.
      await new Promise<void>((resolve) => { setTimeout(resolve, 900); });
      this.state.screen = 'play';
      this.game.scene.start('PlayScene', {
        characterKey: this.state.selectedCharacter,
        displayName: this.state.displayName,
      });
      this.render();
      return;
    }

    // All lives used — save and submit the best run, not the last one
    const bestRun = this.state.bestPendingRun ?? pendingRun;
    savePendingRun(bestRun);
    this.state.pendingRun = bestRun;
    this.state.submittedScore = null;
    this.state.screen = 'result';
    this.state.authMessage = null;
    this.state.loading = false;

    trackEvent('game_over', {
      score: bestRun.score,
      stage: bestRun.stageReached,
      duration_ms: bestRun.durationMs,
      obstacle_clears: bestRun.obstacleClears,
    });

    this.game.scene.start('ResultScene', { pendingRun: bestRun });
    await this.refreshLeaderboards();

    if (this.state.user) {
      await this.unlockPendingRun();
      return;
    }

    this.render();
  }

  private async handleGoogleSignIn(): Promise<void> {
    try {
      const result = await authService.signInWithGoogle();
      this.state.authMessage = result.message;
      trackEvent('auth_method_selected', { method: 'google' });
      this.render();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Google auth failed.';
      this.state.authMessage = message;
      trackEvent('auth_failed', { method: 'google', error_message: message });
      this.render();
    }
  }

  private async handleMagicLink(emailValue: FormDataEntryValue | null): Promise<void> {
    const email = typeof emailValue === 'string' ? emailValue.trim() : '';

    if (!email) {
      this.state.authMessage = 'Enter an email address to use the magic link.';
      this.render();
      return;
    }

    try {
      const result = await authService.signInWithMagicLink(email);
      this.state.authMessage = result.message;
      trackEvent('auth_method_selected', { method: 'magic_link' });
      this.render();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Magic link failed.';
      this.state.authMessage = message;
      trackEvent('auth_failed', { method: 'magic_link', error_message: message });
      this.render();
    }
  }

  private async unlockPendingRun(): Promise<void> {
    if (!this.state.pendingRun || !this.state.session || !this.state.user || this.isUnlockingPendingRun) {
      return;
    }

    this.isUnlockingPendingRun = true;
    this.state.loading = true;
    this.state.authMessage = 'Unlocking your result…';
    this.state.screen = 'result';
    this.render();

    try {
      const authMethod = this.state.authMethod ?? 'magic_link';
      const submitted = await leaderboardService.submitScore(
        this.state.pendingRun,
        this.state.session,
        this.state.user,
        authMethod
      );

      clearPendingRun();
      this.state.submittedScore = submitted;
      this.state.authMessage = authService.isDemoMode()
        ? 'Demo auth active. Configure Supabase to switch to live providers.'
        : 'Score unlocked.';
      trackEvent('score_submitted', {
        score: submitted.score,
        stage: submitted.stageReached,
        auth_method: authMethod,
      });
      audioSystem.play('reveal');
      await this.refreshLeaderboards();
      this.state.pendingRun = null;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Score unlock failed.';
      this.state.authMessage = message;
      trackEvent('score_submit_failed', {
        error_message: message,
        has_user: Boolean(this.state.user),
        pending_score: this.state.pendingRun?.score ?? null,
      });
      console.warn('[score-submit] failed to unlock pending run', error);
    } finally {
      this.isUnlockingPendingRun = false;
      this.state.loading = false;
      this.render();
    }
  }

  private async refreshLeaderboards(): Promise<void> {
    this.state.dailyLeaderboard = await leaderboardService.getDailyLeaderboard(eventConfig.eventName);
    this.state.allTimeLeaderboard = await leaderboardService.getAllTimeLeaderboard(eventConfig.eventName);
    this.state.myBest = this.state.user
      ? await leaderboardService.getMyBest(this.state.user.id, eventConfig.eventName)
      : null;
  }

  private showMenu(): void {
    this.state.screen = 'menu';
    this.state.isLeaderboardOpen = false;
    this.state.loading = false;
    this.game.scene.start('MenuScene');
    this.render();
  }

  private openCharacterSelect(): void {
    this.state.livesRemaining = TOTAL_LIVES;
    this.state.bestPendingRun = null;
    this.state.pendingRun = null;
    this.state.screen = 'character-select';
    this.state.isLeaderboardOpen = false;
    this.state.authMessage = null;
    this.state.loading = false;
    this.state.submittedScore = null;
    clearPendingRun();
    this.game.scene.start('MenuScene');
    this.render();
  }

  private openNameEntry(): void {
    this.state.screen = 'name-entry';
    this.state.isLeaderboardOpen = false;
    this.state.authMessage = null;
    this.render();
  }

  getDebugState(): {
    authMessage: string | null;
    isLoading: boolean;
    livesRemaining: number;
    pendingRunScore: number | null;
    playScene: ReturnType<PlayScene['getDebugSnapshot']> | null;
    rendererType: string;
    screen: ViewState['screen'];
    selectedCharacter: string;
    submittedScore: number | null;
  } {
    const playScene = this.getActivePlaySceneSnapshot();

    return {
      authMessage: this.state.authMessage,
      isLoading: this.state.loading,
      livesRemaining: this.state.livesRemaining,
      pendingRunScore: this.state.pendingRun?.score ?? null,
      playScene,
      rendererType: this.game.config.renderType === Phaser.CANVAS ? 'canvas' : 'auto',
      screen: this.state.screen,
      selectedCharacter: this.state.selectedCharacter,
      submittedScore: this.state.submittedScore?.score ?? null,
    };
  }

  async forceFinishRunForTest(): Promise<void> {
    const current = this.getDebugState();
    const currentInstanceId = current.playScene?.instanceId ?? 0;
    const activeScene = this.getActivePlayScene();

    if (!activeScene) {
      return;
    }

    activeScene.forceFinishForTest();
    await this.waitForDebugSteadyState(currentInstanceId);
  }

  forceSpawnObstacleForTest(key: string): void {
    const activeScene = this.getActivePlayScene();

    if (!activeScene) {
      throw new Error('PlayScene is not active.');
    }

    activeScene.forceSpawnObstacleForTest(key);
  }

  destroyForTest(): void {
    this.game.destroy(true);
    this.overlayRoot.innerHTML = '';
    delete this.overlayRoot.dataset.screen;
  }

  private render(): void {
    this.overlayRoot.dataset.screen = this.state.screen;

    if (this.state.screen === 'play') {
      this.overlayRoot.innerHTML = this.renderPlayOverlay();
      return;
    }

    if (this.state.screen === 'result') {
      this.overlayRoot.innerHTML = this.renderResultOverlay();
      return;
    }

    if (this.state.screen === 'character-select') {
      this.overlayRoot.innerHTML = this.renderCharacterSelectOverlay();
      return;
    }

    if (this.state.screen === 'name-entry') {
      this.overlayRoot.innerHTML = this.renderNameEntryOverlay();
      return;
    }

    this.overlayRoot.innerHTML = this.renderMenuOverlay();
  }

  private getActivePlayScene(): PlayScene | null {
    try {
      const scene = this.game.scene.getScene('PlayScene');

      if (!(scene instanceof PlayScene)) {
        return null;
      }

      return scene.scene?.isActive?.() ? scene : null;
    } catch {
      return null;
    }
  }

  private getActivePlaySceneSnapshot(): ReturnType<PlayScene['getDebugSnapshot']> | null {
    return this.getActivePlayScene()?.getDebugSnapshot() ?? null;
  }

  private async waitForDebugSteadyState(previousInstanceId: number): Promise<void> {
    const timeoutAt = Date.now() + 5000;

    while (Date.now() < timeoutAt) {
      const state = this.getDebugState();

      if (state.screen === 'result') {
        return;
      }

      if (state.screen === 'play' && state.playScene && state.playScene.instanceId > previousInstanceId) {
        return;
      }

      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 25);
      });
    }

    throw new Error('Timed out waiting for the next play or result state.');
  }

  private renderCharacterSelectOverlay(): string {
    const tierOrder: Array<{ tier: string; label: string }> = [
      { tier: 'Platinum', label: 'Platinum Partners' },
      { tier: 'Groundbreakers', label: 'Groundbreakers Partners' },
      { tier: 'Navigators', label: 'Navigators Partners' },
    ];

    const sections = tierOrder
      .map(({ tier, label }) => {
        const group = characters.filter((c) => c.tier === tier);
        if (!group.length) return '';

        const cards = group
          .map((c) => {
            const accentHex = `#${c.palette.accent.toString(16).padStart(6, '0')}`;
            const bodyHex = `#${c.palette.body.toString(16).padStart(6, '0')}`;
            const isSelected = this.state.selectedCharacter === c.key;
            return `
              <button
                class="character-card${isSelected ? ' character-card--selected' : ''}"
                data-action="select-character"
                data-key="${escapeHtml(c.key)}"
                type="button"
              >
                <div class="character-card__avatar" style="background:${bodyHex};border-color:${accentHex};">
                  <div class="character-card__stripe" style="background:${accentHex};"></div>
                  <span class="character-card__mark" style="color:${accentHex};">${escapeHtml(c.logoMark)}</span>
                </div>
                <span class="character-card__name">${escapeHtml(c.label)}</span>
              </button>
            `;
          })
          .join('');

        return `
          <div class="character-tier">
            <p class="eyebrow character-tier__label">${escapeHtml(label)}</p>
            <div class="character-grid">${cards}</div>
          </div>
        `;
      })
      .join('');

    return `
      <section class="overlay-layout overlay-layout--character-select">
        <div class="overlay-column overlay-column--wide">
          <article class="overlay-card overlay-card--floating">
            <div class="top-bar">
              <div>
                <span class="event-chip">${escapeHtml(eventConfig.eventBadge)}</span>
              </div>
              <button class="button button--ghost button--sm" data-action="toggle-mute" type="button">
                ${audioSystem.isMuted() ? 'Sound off' : 'Sound on'}
              </button>
            </div>

            <div class="overlay-headline">
              <h2>Who are you running for?</h2>
              <p>Pick your sponsor. You get ${TOTAL_LIVES} lives to set the best score.</p>
            </div>

            ${sections}
          </article>
        </div>
      </section>
    `;
  }

  private renderNameEntryOverlay(): string {
    const character = characterByKey.get(this.state.selectedCharacter);
    const accentHex = character ? toHex(character.palette.accent) : '#4da68b';
    const bodyHex = character ? toHex(character.palette.body) : '#1a1a1a';

    return `
      <section class="overlay-layout overlay-layout--character-select">
        <div class="overlay-column overlay-column--wide">
          <article class="overlay-card overlay-card--floating name-entry-card">
            <div class="top-bar">
              <span class="event-chip">${escapeHtml(eventConfig.eventBadge)}</span>
              <button class="button button--ghost button--sm" data-action="toggle-mute" type="button">
                ${audioSystem.isMuted() ? 'Sound off' : 'Sound on'}
              </button>
            </div>

            <div class="name-entry-sponsor">
              <div class="name-entry-avatar" style="background:${escapeHtml(bodyHex)};border-color:${escapeHtml(accentHex)};">
                <span style="color:${escapeHtml(accentHex)};">${character ? escapeHtml(character.logoMark) : ''}</span>
              </div>
              <div>
                <p class="eyebrow">Running for</p>
                <p class="name-entry-sponsor__label">${character ? escapeHtml(character.label) : ''}</p>
              </div>
            </div>

            <div class="overlay-headline">
              <h2>What's your name?</h2>
              <p>It goes on the leaderboard. Leave blank to run as Consultant.</p>
            </div>

            <form class="name-entry-form" data-action="name-entry">
              <input
                name="name"
                type="text"
                placeholder="Your name"
                maxlength="40"
                autocomplete="given-name"
                value="${escapeHtml(this.state.displayName)}"
                autofocus
              />
              <button class="button button--primary button--lg" type="submit" style="background:linear-gradient(135deg,${escapeHtml(accentHex)} 0%,${escapeHtml(accentHex)}cc 100%);">
                Let's go
              </button>
            </form>
          </article>
        </div>
      </section>
    `;
  }

  private renderMenuOverlay(): string {
    const hasScores = this.state.dailyLeaderboard.length > 0;
    const leaderboardEntries = hasScores ? this.state.dailyLeaderboard : buildSampleLeaderboard();

    return `
      <section class="overlay-layout">
        <div class="overlay-column">
          <article class="overlay-card overlay-card--floating">
            <div class="top-bar">
              <span class="event-chip">${escapeHtml(eventConfig.eventBadge)}</span>
              <button class="button button--ghost button--sm" data-action="toggle-mute" type="button">
                ${audioSystem.isMuted() ? 'Sound off' : 'Sound on'}
              </button>
            </div>

            <div class="overlay-headline">
              <h2>${escapeHtml(eventConfig.landing.title)}</h2>
              <p>${escapeHtml(eventConfig.landing.concept)}</p>
            </div>

            <div class="hero-stats">
              <div class="hero-stat">
                <span class="hero-stat__label">Goal</span>
                <strong>Reach Go Live</strong>
              </div>
              <div class="hero-stat">
                <span class="hero-stat__label">Runs</span>
                <strong>${TOTAL_LIVES} sponsor-backed attempts</strong>
              </div>
              <div class="hero-stat">
                <span class="hero-stat__label">Skill</span>
                <strong>Tap timing beats panic</strong>
              </div>
            </div>

            <div class="actions actions--stack">
              <button class="button button--primary button--lg" data-action="play" type="button">
                Play now
              </button>
            </div>

            <div class="menu-hint">
              <span class="menu-hint__rule">Tap or press space to jump.</span>
              <span class="menu-hint__rule">${TOTAL_LIVES} lives. Beat your own best.</span>
            </div>
          </article>

          <article class="overlay-card overlay-card--compact leaderboard leaderboard--mobile">
            <div class="leaderboard__header">
              <div>
                <p class="eyebrow">${escapeHtml(eventConfig.leaderboardTitles.daily)}</p>
                <h3>${hasScores ? 'Can you top this?' : 'Target pace for today'}</h3>
              </div>
            </div>
            ${!hasScores ? '<p class="helper-copy">Live board unlocks with the first submitted runs. Until then, beat the pace-setters.</p>' : ''}
            ${formatLeaderboard(leaderboardEntries.slice(0, 5))}
          </article>
        </div>

        <aside class="overlay-card leaderboard leaderboard--sidebar">
          <p class="eyebrow">${escapeHtml(eventConfig.leaderboardTitles.daily)}</p>
          <h3>${hasScores ? 'Can you top this?' : 'Target pace for today'}</h3>
          ${!hasScores ? '<p class="helper-copy">The board is quiet right now, so the pace-setters are on the runway instead.</p>' : ''}
          ${formatLeaderboard(leaderboardEntries)}
        </aside>
      </section>
    `;
  }

  private renderPlayOverlay(): string {
    const character = characterByKey.get(this.state.selectedCharacter);
    const accentHex = character ? toHex(character.palette.accent) : '#4da68b';
    const currentRun = TOTAL_LIVES - this.state.livesRemaining + 1;

    return `
      <section class="overlay-layout overlay-layout--play">
        <div class="overlay-column">
          <article class="overlay-card overlay-card--compact play-hud">
            <div class="play-hud__left">
              <span class="status-chip">Run ${currentRun} of ${TOTAL_LIVES}</span>
              <div class="lives-display">
                ${renderLivesDots(this.state.livesRemaining, TOTAL_LIVES)}
              </div>
              ${character ? `<span class="play-hud__sponsor" style="color:${escapeHtml(accentHex)};">${escapeHtml(character.label)}</span>` : ''}
            </div>
            <button class="button button--ghost button--sm" data-action="toggle-mute" type="button">
              ${audioSystem.isMuted() ? 'Sound off' : 'Sound on'}
            </button>
          </article>
          <article class="overlay-card overlay-card--compact play-hint">
            <div class="play-hint__content">
              <strong>Find the rhythm</strong>
              <p>Early jumps are forgiving now. Let the blocker come to you, then tap once and stay composed.</p>
            </div>
          </article>
        </div>
      </section>
    `;
  }

  private renderResultOverlay(): string {
    const score = this.state.submittedScore ?? this.state.pendingRun;
    const stage = score?.stageReached ?? 'Discovery';
    const stageLabel = stage === 'Go Live' ? 'Go Live 🎉' : stage;
    const displayScore = score?.score ?? 0;
    const rank = this.state.submittedScore?.rank ?? null;
    const percentile = this.state.submittedScore?.percentile ?? null;
    const character = characterByKey.get(this.state.selectedCharacter);
    const scoreMood = getScoreMood(displayScore);
    const obstacleClears = score && 'obstacleClears' in score ? score.obstacleClears : 0;
    const dailyEntries = this.state.dailyLeaderboard.length ? this.state.dailyLeaderboard : buildSampleLeaderboard();
    const allTimeEntries = this.state.allTimeLeaderboard.length ? this.state.allTimeLeaderboard : buildSampleLeaderboard();
    const productUrl = buildCtaUrl(eventConfig.consultantCloudCtaUrl, {
      source: 'consultantrun',
      event_name: this.state.session?.eventName,
      role_intent: this.state.roleIntent,
      score: displayScore,
      stage,
      utm_source: this.state.session?.utm.utmSource,
      utm_medium: this.state.session?.utm.utmMedium,
      utm_campaign: this.state.session?.utm.utmCampaign,
      utm_content: this.state.session?.utm.utmContent,
    });

    return `
      <section class="overlay-layout">
        <div class="overlay-column">
          <article class="overlay-card overlay-card--floating">
            <div class="top-bar">
              <span class="event-chip">${escapeHtml(eventConfig.eventBadge)}</span>
              <button class="button button--ghost button--sm" data-action="toggle-mute" type="button">
                ${audioSystem.isMuted() ? 'Sound off' : 'Sound on'}
              </button>
            </div>

            ${character ? `
              <div class="result-sponsor">
                ${renderCompanyBadge(this.state.selectedCharacter)}
                <span class="result-sponsor__label">ran for</span>
              </div>
            ` : ''}

            <div class="overlay-headline">
              <h2>${escapeHtml(stage === 'Go Live' ? 'Project landed!' : `Stalled in ${stage}.`)}</h2>
              <p class="result-kicker">${escapeHtml(scoreMood.title)}</p>
              <p>
                ${
                  this.state.submittedScore
                    ? 'Your score is on the leaderboard.'
                    : 'Sign in to lock in your score and claim a prize at the stand.'
                }
              </p>
            </div>

            <div class="result-grid">
              <span class="status-chip">${escapeHtml(scoreMood.badge)}</span>
              <p class="helper-copy">${escapeHtml(stageDescriptions[stage] ?? stageDescriptions.Discovery)}</p>
            </div>

            <div class="stat-grid">
              <article class="stat-card">
                <span class="stat-card__label">Score</span>
                <span class="stat-card__value">${displayScore}</span>
              </article>
              <article class="stat-card">
                <span class="stat-card__label">Stage</span>
                <span class="stat-card__value">${escapeHtml(stageLabel)}</span>
              </article>
              <article class="stat-card">
                <span class="stat-card__label">Rank</span>
                <span class="stat-card__value">${rank ? `#${rank}` : '—'}</span>
              </article>
              <article class="stat-card">
                <span class="stat-card__label">Prize</span>
                <span class="stat-card__value">${this.state.submittedScore ? 'Claim at stand' : 'Sign in first'}</span>
              </article>
              <article class="stat-card">
                <span class="stat-card__label">Clean clears</span>
                <span class="stat-card__value">${obstacleClears}</span>
              </article>
            </div>

            ${
              this.state.submittedScore
                ? `
                  <div class="result-grid">
                    <span class="status-chip">Top ${percentile}% of players today</span>
                  </div>

                  <div class="result-grid">
                    <p class="eyebrow">What are you preparing for?</p>
                    <div class="role-grid">
                      ${eventConfig.roleOptions
                        .map(
                          (role) => `
                            <button
                              type="button"
                              class="role-chip ${this.state.roleIntent === role ? 'role-chip--active' : ''}"
                              data-action="select-role"
                              data-role="${escapeHtml(role)}"
                            >
                              ${escapeHtml(role)}
                            </button>
                          `
                        )
                        .join('')}
                    </div>
                  </div>

                  <div class="actions actions--stack">
                    <button class="button button--primary button--lg" data-action="replay" type="button">Play again</button>
                    <a class="button button--ghost" data-action="product-cta" href="${escapeHtml(productUrl)}">
                      ${escapeHtml(eventConfig.premiumCtaLabel)}
                    </a>
                    <button class="button button--ghost button--sm" data-action="sign-out" type="button">Sign out</button>
                  </div>
                `
                : `
                  <div class="actions actions--stack">
                    ${
                      eventConfig.enableGoogleAuth
                        ? '<button class="button button--primary button--lg" data-action="auth-google" type="button">Sign in with Google to claim</button>'
                        : ''
                    }
                    <button class="button button--ghost${eventConfig.enableGoogleAuth ? '' : ' button--lg'}" data-action="replay" type="button">Play again</button>
                  </div>
                  <form class="auth-form" data-action="magic-link">
                    <label>
                      Or use a magic link
                      <input name="email" type="email" placeholder="you@company.com" required />
                    </label>
                    <button class="button button--ghost button--wide" type="submit">Send link</button>
                  </form>
                  <p class="helper-copy">
                    ${
                      authService.isDemoMode()
                        ? 'Demo auth mode is active locally.'
                        : eventConfig.enableGoogleAuth
                          ? 'Takes 5 seconds on the event floor.'
                          : 'Magic link is enabled.'
                    }
                  </p>
                `
            }

            ${
              this.state.authMessage
                ? `<p class="helper-copy">${escapeHtml(this.state.authMessage)}</p>`
                : ''
            }
          </article>
        </div>

        <aside class="overlay-column">
          <article class="overlay-card leaderboard">
            <p class="eyebrow">${escapeHtml(eventConfig.leaderboardTitles.daily)}</p>
            <h3>Today's leaderboard</h3>
            ${!this.state.dailyLeaderboard.length ? '<p class="helper-copy">Live submissions will replace these pace-setters as players hit the board.</p>' : ''}
            ${formatLeaderboard(dailyEntries)}
          </article>

          <article class="overlay-card leaderboard">
            <p class="eyebrow">${escapeHtml(eventConfig.leaderboardTitles.allTime)}</p>
            <h3>All-time board</h3>
            ${formatLeaderboard(allTimeEntries.slice(0, 5))}
          </article>

          ${
            this.state.myBest
              ? `
                <article class="overlay-card leaderboard">
                  <p class="eyebrow">${escapeHtml(eventConfig.leaderboardTitles.myBest)}</p>
                  <h3>Your best</h3>
                  ${formatLeaderboard([this.state.myBest])}
                </article>
              `
              : ''
          }
        </aside>
      </section>
    `;
  }
}
