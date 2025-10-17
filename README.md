![Punch In logo](img/logo.png)

# Punch In — Electron Time Tracker

A focused, minimal Mac menu-bar Electron app for tracking time by project. It combines a small Next.js renderer (Timer & Reports UI) with a TypeScript Electron main process and a local SQLite database for durable storage. Now with 40% more vibe coding.

Key ideas
- Lightweight: minimal UI for quickly starting/stopping tracked sessions.
- Local-first: uses a local SQLite DB (better-sqlite3) stored in Electron's userData directory.
- Simple integration surface: renderer talks to the main process via a single preload bridge `window.tp`.

Highlights
- Tray/menu-bar item showing current project & elapsed time
- Next.js renderer for the UI (located at `src/renderer`)
- TypeScript main process and services (`src/main`) with a clear service layer and IPC handlers

Quick links
- Main process entry: `src/main/index.ts`
- IPC handlers: `src/main/handlers/*.ts`
- Services & DB: `src/main/services/*.ts` (see `ServiceManager` and `data.ts`)
- Renderer entry: `src/renderer/app/page.tsx`

Getting started (development)

Install dependencies:

```bash
npm install
```

Run renderer only (fast UI iteration):

```bash
npm run dev:ui
```

Run the full app (build + Electron):

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Start the packaged app (after build):

```bash
npm start
```

Testing & linting

Run the test suite (Jest):

```bash
npm test
```

Run lint checks:

```bash
npm run lint
```

Important developer notes
- Native sqlite: `better-sqlite3` is a native module. The project runs `electron-rebuild` in `postinstall` and before `start`/`package`. If CI or your machine changes Node/Electron versions, run:

```bash
npm run rebuild:sqlite
```

- DB location: the SQLite DB file lives in Electron's `userData` directory (see `src/main/services/data.ts`). Schema is created programmatically; the initializer is named `createScema` (note the spelling).

- IPC conventions: all channels are prefixed with `tp:` and the preload exposes a single global API at `window.tp` (`src/preload.ts`). Handlers live under `src/main/handlers` and call through to services from `src/main/services/`.

CI / Build

The repository includes a GitHub Actions workflow at `.github/workflows/development.yml` that runs lint, tests and a full build on merges/pushes to `main`.

Contributing

Contributions are welcome. Small, focused PRs are preferred. A few repository-specific guidelines:

- Add new IPC handlers under `src/main/handlers` and wire them in `src/main/handlers/index.ts`.
- Put business logic in services inside `src/main/services` and avoid raw SQL in handlers.
- Follow the `*Model` type convention for IPC payloads (e.g., `ProjectModel`, `TaskModel`).

License

MIT — see `LICENSE.md`.