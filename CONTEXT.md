# ConsultantRun — LLM Context File

This file gives a new LLM enough context to take over development of this codebase without prior conversation history.

---

## What this is

**ConsultantRun** is a Phaser 3 + TypeScript endless-runner browser game built as an event activation for **Agentforce World Tour Belgium 2026** (19 May 2026). Players jump over consulting-project obstacles (Scope Creep, UAT Fail, etc.), pick a sponsor to run for, enter their name, and submit their score to a live leaderboard. It is deployed on Vercel at **https://consultantrun.vercel.app**.

The game is built by **ConsultantCloud** (https://consultantcloud.io). The leaderboard doubles as a lead-gen tool — players sign in with Google or magic link to unlock their score, claim a prize at the stand, and get shown a CTA to ConsultantCloud.

---

## Tech stack

| Layer | Technology |
|---|---|
| Game engine | Phaser 3 (`^3.90.0`) |
| Language | TypeScript (`~6.0.2`) |
| Build tool | Vite (`^8.0.4`) |
| Backend / DB | Supabase (PostgreSQL + Auth + RLS) |
| Deployment | Vercel (auto-deploys from `main`) |
| E2E tests | Playwright (`@playwright/test`) |

---

## Project structure

```
src/
  main.ts                   # HTML shell, mounts AppController, debug hooks
  style.css                 # All CSS — dark glassmorphism theme
  app/
    AppController.ts        # Central state machine — owns all screens and transitions
  config/
    difficulty.ts           # Speed, gravity, spawn gaps, jump velocity
    event.ts                # All copy, CTA URLs, leaderboard titles — edit this for each event
    game.ts                 # gameConfig, characters (13 sponsors), obstacleDefinitions
  types/
    app.ts                  # All shared TypeScript interfaces
  game/
    createGame.ts           # Phaser.Game factory
    scenes/
      BootScene.ts          # Minimal boot, starts PreloadScene
      PreloadScene.ts       # Loads all assets, then starts MenuScene
      MenuScene.ts          # Idle animation while menu overlay is shown
      PlayScene.ts          # Main game loop — physics, scoring, obstacle spawning
      ResultScene.ts        # Shown briefly on death (player fail animation)
    objects/
      Player.ts             # Phaser sprite — run/jump/fail states from spritesheet
      Obstacle.ts           # Phaser sprite — scaled to definition dimensions
      StageTracker.ts       # Maps score → stage label (Discovery → Go Live)
    systems/
      AudioSystem.ts        # Web Audio sound effects
      DifficultySystem.ts   # Speed ramp over time
      ScoreSystem.ts        # Score + distance + elapsed time accumulator
      SpawnSystem.ts        # Weighted random obstacle spawning
      SceneBackdrop.ts      # Scrolling grid/bar background tiles
      TextureFactory.ts     # Generates ground-strip texture procedurally
      RunnerSprites.ts      # Loads runner PNG spritesheets, registers animations
      ObstacleSprites.ts    # Loads obstacle PNGs
      characterStore.ts     # localStorage-backed active character key
  services/
    analytics.ts            # trackEvent() wrapper
    auth.ts                 # Supabase Auth — Google OAuth + magic link + demo mode
    eventSession.ts         # Creates/restores anonymous session with UTM data
    leaderboard.ts          # submitScore, getDailyLeaderboard, getAllTimeLeaderboard, getMyBest
    storage.ts              # All localStorage read/write helpers
    supabase.ts             # Supabase client (null if env vars missing)
    utm.ts                  # Reads UTM params from URL
  assets/
    sprites/runners/        # 13 PNG spritesheets (one per sponsor character)
    obstacles/              # 7 PNG obstacle images
supabase/
  schema.sql                # Full DB schema + RLS policies + submit_score_secure() RPC
  migrations/               # Incremental migration files
tests/
  mobile/
    helpers.ts              # waitForScreen, startRun, getDebugState, cleanupApp
    character-select.spec.ts
    play-mobile.spec.ts
```

---

## Player flow

```
Menu → Character Select → Name Entry → Play (3 lives) → Result
```

1. **Menu** — headline, Play Now button, leaderboard visible inline on mobile / sidebar on desktop
2. **Character Select** — 13 sponsor cards grouped by tier (Platinum / Groundbreakers / Navigators)
3. **Name Entry** — single text input, shows chosen sponsor badge, autofocused. Saved to localStorage, persists across replays on personal phones. Defaults to "Consultant" if blank.
4. **Play** — Phaser game. 3 lives. After each death (lives 1 and 2) the scene auto-restarts after 900ms. After life 3, transitions to Result.
5. **Result** — shows best score across all 3 lives (not just the last run). Player signs in with Google / magic link to submit score to Supabase and claim a prize.

---

## Key architectural decisions

### AppController is the single source of truth
`src/app/AppController.ts` owns all UI state (`ViewState`), renders HTML overlays via template strings, and communicates with Phaser via `game.events.emit('run-ended', pendingRun)`. Phaser scenes are purely visual — they emit events upward, never pull from app state directly.

### Best run across 3 lives
`ViewState.bestPendingRun` tracks the `PendingRun` with the highest score across all 3 lives. On final death, `bestPendingRun` is saved and submitted — not the last life's run.

### displayName flows from name entry → PendingRun → Supabase
`state.displayName` is set at name-entry, passed into `PlayScene` via scene init data, stamped onto every `PendingRun`, and used in `leaderboardService.submitScore()` as `p_display_name`. The auth user's display name is only used as a fallback.

### Scene/UI sync on lives restart
After a mid-run death (lives remaining > 0): wait 900ms (fail animation), then call `scene.start()` and `render()` together. This ensures `data-screen="play"` in the DOM and the active Phaser scene flip at the same instant — critical for Playwright tests.

### Supabase score submission
Always goes through the `submit_score_secure()` RPC first (server-side validation). Falls back to a direct insert if the RPC fails. Score must be 1–5000, distance 1–500000, and the calling user's `auth.uid()` must match `p_user_id`.

### Character textures
Each of the 13 sponsors has a PNG spritesheet in `src/assets/sprites/runners/`. `RunnerSprites.ts` loads them and registers animations (`{key}-idle`, `{key}-run`, `{key}-jump`, `{key}-fall`, `{key}-fail`). The active character key is stored in localStorage via `characterStore.ts`.

---

## Sponsors (characters)

| Key | Label | Tier | Brand colour |
|---|---|---|---|
| runner-deloitte | Deloitte Digital | Platinum | `#86BC25` green |
| runner-spire | spire. | Platinum | `#00AEEF` blue |
| runner-delaware | delaware | Platinum | `#C8102E` red |
| runner-accenture | Accenture | Groundbreakers | `#A100FF` purple |
| runner-pwc | PwC | Groundbreakers | `#E0301E` red |
| runner-capgemini | Capgemini | Groundbreakers | `#0070AD` blue |
| runner-valantic | valantic | Groundbreakers | `#00A4B4` teal |
| runner-easi | easi | Groundbreakers | `#1B2A6B` navy |
| runner-inetum | inetum | Groundbreakers | `#005CA9` blue |
| runner-genesys | Genesys | Navigators | `#FF4F1F` orange |
| runner-butler | Butler | Navigators | `#C87941` brown |
| runner-novera | Novera Solutions | Navigators | `#6B8E5E` green |
| runner-nrb | NRB | Navigators | `#1B3A6B` navy |

---

## Environment variables

Required in `.env.local` (or Vercel environment settings):

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_EVENT_NAME=Agentforce Belgium 2026
VITE_EVENT_BADGE=Agentforce Belgium 2026
VITE_ENABLE_GOOGLE_AUTH=true
VITE_CONSULTANT_CLOUD_CTA_URL=https://consultantcloud.io/start
```

If `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are missing, the app runs in local-only mode (scores saved to localStorage only). Auth falls back to demo mode.

---

## Common commands

```bash
npm install
npm run dev              # Vite dev server on localhost:5173
npm run build            # TypeScript check + Vite production build
npm run typecheck        # tsc --noEmit only
npm run test:e2e:mobile  # Playwright mobile tests (requires dev server running)
```

---

## Database

Schema is in `supabase/schema.sql`. Three tables:

- **`event_sessions`** — anonymous session per page load, tracks UTM
- **`scores`** — one row per submitted run; has `character_key`, `display_name`, `prize_status`
- **`prize_claims`** — staff-side prize redemption tracking

RLS: scores are publicly readable, insertable/updatable only by the owning authenticated user. All inserts go through `submit_score_secure()` RPC which validates score/distance ranges server-side.

---

## Open PRs (as of April 2026)

| PR | Branch | Description |
|---|---|---|
| #5 | `feature/obstacle-asset-refresh` | Replace 7 obstacle PNGs with new 1024×1024 branded versions |

---

## Rules for this repo

- **Never push directly to `main`** — always use a feature branch and open a PR. Vercel auto-deploys `main` immediately.
- All changes go through PRs so the owner can review before they go live.
- Run `npm run typecheck` before committing — CI will catch type errors.
