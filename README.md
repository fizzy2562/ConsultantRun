# ConsultantRun

ConsultantRun is a mobile-first microsite game for ConsultantCloud event activations. It uses `TypeScript`, `Vite`, `Phaser`, and `Supabase` to deliver a QR-friendly endless runner with post-game auth and leaderboard unlock.

## Stack

- TypeScript
- Vite
- Phaser 3
- Supabase
- Vercel-ready static deployment

## Local development

```bash
npm install
npm run dev
```

Create a `.env.local` file from `.env.example` to enable real Supabase auth and persistence. Without Supabase environment variables the app runs in a local demo mode with mock auth and local leaderboard storage.

## Scripts

- `npm run dev` starts the Vite dev server.
- `npm run typecheck` runs TypeScript checks.
- `npm run build` performs a full production build.
- `npm run preview` serves the production build locally.

## Project structure

```text
src/
  app/
  assets/
  config/
  game/
  services/
  types/
supabase/
  schema.sql
docs/
  architecture.md
```

## Deployment

Deploy the built app to Vercel as a standard Vite project. Add the environment variables from `.env.example` in the Vercel project settings before enabling production auth and leaderboard writes.
