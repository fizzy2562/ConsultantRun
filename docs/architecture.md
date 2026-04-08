# Architecture

ConsultantRun is split into three runtime layers:

1. Phaser game runtime
   - Owns rendering, input, physics, scoring, stage progression, and obstacle spawning.
   - Scenes stay focused on gameplay and presentation.
2. App controller and overlay UI
   - Owns menu, pre-auth result, unlocked result, leaderboard panels, and CTA wiring.
   - Receives game events and translates them into auth and leaderboard actions.
3. Service layer
   - Owns UTM capture, event session persistence, auth state, leaderboard reads and writes, and analytics dispatch.

## Data flow

1. First page load captures UTM values and creates or restores an anonymous event session.
2. The player starts a run from the landing overlay.
3. On game over, the app stores a `PendingRun` locally.
4. If the player is authenticated, the app submits the score immediately.
5. If the player is anonymous, the app shows the unlock flow and restores the pending run after auth.
6. The unlocked result view shows rank, reward state, and ConsultantCloud CTA handoff.

## Persistence strategy

- Supabase is the primary backend when configured.
- Local storage is the fallback for development and demo mode.
- The service contract is the same in both modes so UI and game code remain unchanged.
