import Phaser from 'phaser';
import { eventConfig } from '../config/event';
import { createGame } from '../game/createGame';
import { audioSystem } from '../game/systems/AudioSystem';
import { authService } from '../services/auth';
import { trackEvent } from '../services/analytics';
import { createOrRestoreEventSession } from '../services/eventSession';
import { leaderboardService } from '../services/leaderboard';
import {
  clearPendingRun,
  getPendingRun,
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

interface AppControllerOptions {
  overlayRoot: HTMLElement | null;
  phaserRootId: string;
}

interface ViewState {
  screen: 'menu' | 'play' | 'result';
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
    return '<p class="helper-copy">No scores have landed yet. Set the pace.</p>';
  }

  return `
    <ol>
      ${entries
        .map(
          (entry) => `
            <li>
              <span class="leaderboard-rank">#${entry.rank}</span>
              <div class="leaderboard__meta">
                <span class="leaderboard__name">${escapeHtml(entry.displayName)}</span>
                <span class="leaderboard__subline">${escapeHtml(entry.stageReached)} · ${entry.percentile}% percentile</span>
              </div>
              <span class="leaderboard__score">${entry.score}</span>
            </li>
          `
        )
        .join('')}
    </ol>
  `;
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

  private state: ViewState = {
    screen: 'menu',
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

    await this.refreshLeaderboards();

    if (this.state.user && this.state.pendingRun) {
      await this.unlockPendingRun();
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

      if (action === 'play' || action === 'replay') {
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

      if (form.dataset.action !== 'magic-link') {
        return;
      }

      event.preventDefault();
      void this.handleMagicLink(new FormData(form).get('email'));
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
    this.state.authMessage = null;
    this.state.submittedScore = null;
    this.state.pendingRun = null;
    clearPendingRun();
    this.render();
    trackEvent('play_clicked');
    this.game.scene.start('PlayScene');
  }

  private async handleRunEnded(pendingRun: PendingRun): Promise<void> {
    savePendingRun(pendingRun);
    this.state.pendingRun = pendingRun;
    this.state.submittedScore = null;
    this.state.screen = 'result';
    this.state.authMessage = null;
    this.state.loading = false;

    trackEvent('game_over', {
      score: pendingRun.score,
      stage: pendingRun.stageReached,
      duration_ms: pendingRun.durationMs,
      obstacle_clears: pendingRun.obstacleClears,
    });

    this.game.scene.start('ResultScene', { pendingRun });
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
      this.state.authMessage = error instanceof Error ? error.message : 'Google auth failed.';
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
      this.state.authMessage = error instanceof Error ? error.message : 'Magic link failed.';
      this.render();
    }
  }

  private async unlockPendingRun(): Promise<void> {
    if (!this.state.pendingRun || !this.state.session || !this.state.user || this.state.loading) {
      return;
    }

    this.state.loading = true;
    this.state.authMessage = 'Unlocking your result…';
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
      this.state.authMessage = error instanceof Error ? error.message : 'Score unlock failed.';
    } finally {
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
    this.state.loading = false;
    this.game.scene.start('MenuScene');
    this.render();
  }

  private render(): void {
    if (this.state.screen === 'play') {
      this.overlayRoot.innerHTML = this.renderPlayOverlay();
      return;
    }

    if (this.state.screen === 'result') {
      this.overlayRoot.innerHTML = this.renderResultOverlay();
      return;
    }

    this.overlayRoot.innerHTML = this.renderMenuOverlay();
  }

  private renderMenuOverlay(): string {
    return `
      <section class="overlay-layout">
        <div class="overlay-column">
          <article class="overlay-card overlay-card--floating">
            <div class="top-bar">
              <span class="event-chip">${escapeHtml(eventConfig.eventBadge)}</span>
              <div class="top-bar__actions">
                <button class="button button--subtle button--ghost" data-action="toggle-mute" type="button">
                  ${audioSystem.isMuted() ? 'Sound off' : 'Sound on'}
                </button>
              </div>
            </div>

            <div class="overlay-headline">
              <p class="eyebrow">Go Live</p>
              <h2>${escapeHtml(eventConfig.landing.title)}</h2>
              <p>${escapeHtml(eventConfig.landing.concept)}</p>
            </div>

            <div class="actions">
              <button class="button button--primary" data-action="play" type="button">Play now</button>
              <span class="status-chip">Top scores today at Agentforce</span>
            </div>

            <p class="helper-copy">
              ${escapeHtml(eventConfig.landing.teaser)} Anonymous play is instant. Unlock happens after the run.
            </p>
          </article>

          <article class="overlay-card overlay-card--compact play-hint">
            <strong>One hand. One jump.</strong>
            <p>Tap anywhere on mobile or hit space on desktop to clear project blockers.</p>
          </article>
        </div>

        <aside class="overlay-card leaderboard">
          <p class="eyebrow">${escapeHtml(eventConfig.leaderboardTitles.daily)}</p>
          <h3>Room pace</h3>
          ${formatLeaderboard(this.state.dailyLeaderboard)}
        </aside>
      </section>
    `;
  }

  private renderPlayOverlay(): string {
    return `
      <section class="overlay-layout overlay-layout--play">
        <div class="overlay-column">
          <article class="overlay-card overlay-card--compact play-hint">
            <div class="top-bar">
              <div>
                <p class="eyebrow">${escapeHtml(eventConfig.eventBadge)}</p>
                <strong>Tap or press space to jump</strong>
              </div>
              <button class="button button--subtle button--ghost" data-action="toggle-mute" type="button">
                ${audioSystem.isMuted() ? 'Sound off' : 'Sound on'}
              </button>
            </div>
          </article>
        </div>
      </section>
    `;
  }

  private renderResultOverlay(): string {
    const score = this.state.submittedScore ?? this.state.pendingRun;
    const teaserScore = score ? `Score locked at ${Math.max(score.score - 17, 0)}+` : 'Score ready to unlock';
    const stage = score?.stageReached ?? 'Discovery';
    const fullScore = this.state.submittedScore?.score ?? null;
    const rank = this.state.submittedScore?.rank ?? null;
    const percentile = this.state.submittedScore?.percentile ?? null;
    const productUrl = buildCtaUrl(eventConfig.consultantCloudCtaUrl, {
      source: 'consultantrun',
      event_name: this.state.session?.eventName,
      role_intent: this.state.roleIntent,
      score: fullScore,
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
              <button class="button button--subtle button--ghost" data-action="toggle-mute" type="button">
                ${audioSystem.isMuted() ? 'Sound off' : 'Sound on'}
              </button>
            </div>

            <div class="overlay-headline">
              <p class="eyebrow">${this.state.submittedScore ? 'Unlocked result' : 'Result tease'}</p>
              <h2>${escapeHtml(stage === 'Go Live' ? 'Project landed.' : `Project stalled in ${stage}.`)}</h2>
              <p>
                ${
                  this.state.submittedScore
                    ? 'You unlocked the full result, leaderboard placement, and ConsultantCloud handoff.'
                    : `${escapeHtml(teaserScore)}. ${escapeHtml(eventConfig.resultCopy.lockedBody)}`
                }
              </p>
            </div>

            <div class="stat-grid">
              <article class="stat-card">
                <span class="stat-card__label">Stage</span>
                <span class="stat-card__value">${escapeHtml(stage)}</span>
              </article>
              <article class="stat-card">
                <span class="stat-card__label">${this.state.submittedScore ? 'Score' : 'Tease'}</span>
                <span class="stat-card__value">${this.state.submittedScore ? fullScore : 'Locked'}</span>
              </article>
              <article class="stat-card">
                <span class="stat-card__label">Rank</span>
                <span class="stat-card__value">${rank ? `#${rank}` : 'Unlock'}</span>
              </article>
              <article class="stat-card">
                <span class="stat-card__label">Prize</span>
                <span class="stat-card__value">${this.state.submittedScore ? 'Reward unlocked' : 'Pending'}</span>
              </article>
            </div>

            ${
              this.state.submittedScore
                ? `
                  <div class="result-grid">
                    <span class="status-chip">Top ${percentile}% of players today</span>
                    <p class="helper-copy">
                      Best today: ${
                        this.state.myBest
                          ? `#${this.state.myBest.rank} with ${this.state.myBest.score}`
                          : 'waiting for your first stored score'
                      }.
                    </p>
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

                  <div class="actions">
                    <button class="button button--ghost" data-action="replay" type="button">Play again</button>
                    <a class="button button--primary" data-action="product-cta" href="${escapeHtml(productUrl)}">
                      ${escapeHtml(eventConfig.premiumCtaLabel)}
                    </a>
                    <button class="button button--ghost" data-action="sign-out" type="button">Sign out</button>
                  </div>
                `
                : `
                  <div class="actions">
                    <button class="button button--primary" data-action="auth-google" type="button">Unlock with Google</button>
                    <button class="button button--ghost" data-action="replay" type="button">Play again</button>
                  </div>
                  <form class="auth-form" data-action="magic-link">
                    <label>
                      Unlock with magic link
                      <input name="email" type="email" placeholder="you@company.com" required />
                    </label>
                    <button class="button button--wide button--ghost" type="submit">Email me the unlock link</button>
                  </form>
                  <p class="helper-copy">
                    ${authService.isDemoMode() ? 'Demo auth mode is active locally.' : 'Google is the fastest path on the event floor.'}
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
            <h3>Daily leaderboard</h3>
            ${formatLeaderboard(this.state.dailyLeaderboard)}
          </article>

          <article class="overlay-card leaderboard">
            <p class="eyebrow">${escapeHtml(eventConfig.leaderboardTitles.allTime)}</p>
            <h3>All-time board</h3>
            ${formatLeaderboard(this.state.allTimeLeaderboard.slice(0, 5))}
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
