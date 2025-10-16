This repository is a small Electron + Next.js app (Mac menu bar) for tracking time by project.

Key facts for an AI code assistant working in this repo
- Big picture:
  - The app is an Electron shell with a Next.js renderer located in `src/renderer` and a TypeScript main process in `src/main`.
  - Runtime flow: main process (compiled to `dist/main`) boots Electron, registers a custom `app://` scheme (`src/main/protocol.ts`), creates the main window (`src/main/windows.ts`) and the tray (`src/main/tray.ts`).
  - The renderer is built with Next.js; production assets are served from `dist/renderer` via the `app://` handler.

- IPC / integration patterns (most important):
  - The preload script exposes a single global API at `window.tp` (`src/preload.ts`). All renderer ↔ main communication goes through this API and IPC channels prefixed with `tp:`.
  - IPC handlers live in `src/main/handlers` and are registered centrally in `src/main/handlers/index.ts` using `ipcMain.handle('tp:...', ...)`.
  - Service logic is implemented behind a singleton `ServiceManager` in `src/main/services/manager.ts` which constructs service objects (`project`, `company`, `task`, `session`) that wrap the DB layer.

- Data layer specifics:
  - A local SQLite DB (better-sqlite3) is created in the Electron `userData` directory by `src/main/services/data.ts` (class `DB`). The schema is created programmatically on startup.
  - The schema uses soft-delete via an `is_active` flag + `deleted_at` timestamps and DB triggers to keep `updated_at` in sync. Expect constraints and triggers in `createScema` in `data.ts`.
  - Native module note: `better-sqlite3` is rebuilt with `electron-rebuild` — `npm run rebuild:sqlite` (also run by `postinstall`, `prestart`, `prepackage`).

- Conventions & patterns to follow when editing or adding features:
  - IPC naming: use `tp:` prefix for channels (e.g. `tp:getProjectList`). Register handlers in `src/main/handlers/index.ts` and expose them in `src/preload.ts` under `window.tp` with matching names.
  - Services: obtain services via `ServiceManager.getInstance()`; prefer adding logic to a service (`src/main/services/*.ts`) rather than directly in handlers.
  - Models: types are declared with `*Model` suffix (e.g. `ProjectModel`, `TaskModel`) inside `src/main/services/*` — follow those shapes for IPC payloads.
  - UI → main flow: renderer calls `window.tp` (preload) → IPC channel → handler → service → `better-sqlite3` DB.

  - Important renderer dev-note: the renderer can run in isolation (Next dev) without the Electron preload. When editing renderer code, guard calls to `window.tp` (for example: `window.tp?.getTasks?.()` or `if (window?.tp) await window.tp.getTasks()`) to avoid runtime errors when the preload is absent. See `src/renderer/app/timer/page.tsx`, `src/renderer/app/configure/page.tsx` and `src/renderer/app/reports/page.tsx` for examples.

- Dev ergonomics additions (new in this branch):
  - Dev stub: `src/renderer/components/DevTPStub.tsx` provides an in-browser fake `window.tp` implementation for running the renderer standalone. It activates only when `window.tp` is not already present. Use it to prototype UI interactions without starting Electron.
    - The stub sets `window.__TP_STUB_ACTIVE = true` so components can detect stub mode for UX hints.
  - Dev badge: `src/renderer/components/DevBadge.tsx` shows a small indicator when the stub is active.
  - Guarded calls: renderer pages were updated to defensively call `window.tp` with optional chaining or runtime checks to avoid throwing in standalone mode.
  - Select controls: several pages had `selected` props on `<option>` elements (React warning). These were converted to controlled `<select value=...>` usage (see `configure/page.tsx` and `timer/page.tsx`).

- Build / dev / test workflows (concrete commands)
  - Dev renderer only: npm run dev:ui  (runs Next dev for `src/renderer`)
  - Full dev (build + Electron): npm run dev  (exports ENV=development and runs the start path)
  - Build for production: npm run build (cleans, builds renderer, runs `tsc`, copies svg assets)
  - Start packaged app locally after build: npm start  (calls `electron .` and expects `dist/main/index.js`)
  - Rebuild native sqlite binary (needed when switching node/electron or architecture): npm run rebuild:sqlite
  - Tests: npm test (Jest, renderer tests use jsdom; there are unit tests in `src/renderer/__tests__` and `src/renderer/lib/time.test.ts`)
  - Lint: npm run lint

- Packaging & assets
  - An `img/icon.icns` is used for packaging on macOS and is wired into the `package` script. The repo includes a helper `scripts/make-icon.sh` to generate an `.icns` from `img/logo.png` (macOS only). If CI needs to package on macOS, ensure `.icns` is present or the CI runs the script on macOS.
  - `package.json` has a `copy:assets` step to copy renderer SVGs and icon files into `dist` so the `app://` protocol can serve them.

- Small but important gotchas the assistant should surface in PRs / edits
  - `dist` must contain the renderer build for the `app://` protocol to serve static files. The `copy:assets` script copies SVGs (and icons) from `src/renderer`/`img` into `dist` after build.
  - Native module rebuild is required for `better-sqlite3`. CI/packaging must include `electron-rebuild` or run `npm run rebuild:sqlite`.
  - The DB initializer function is named `createScema` (note spelling) — search that exact name if tracing schema code.
  - Development-only CSP: to enable React Fast Refresh in Next dev the layout includes `'unsafe-eval'` in the CSP only when NODE_ENV === 'development'. Be cautious: do not copy that relaxed CSP to production.

- Quick how-to examples (minimal, concrete)
  - Add a new IPC handler: create `src/main/handlers/foo.ts` that returns a factory (services) => ({ myAction: (e, arg) => { ... } }); then import and wire it in `src/main/handlers/index.ts` with `ipcMain.handle('tp:myAction', fooHandler(services).myAction)` and expose a matching method in `src/preload.ts`.
  - Read/update DB: add logic to an existing service in `src/main/services/*` and call it from handlers; avoid putting SQL directly in handlers.
  - Renderer standalone dev: if you want to run `npm run dev:ui` and have the UI interact without Electron, rely on `DevTPStub` (it auto-attaches when `window.tp` is missing). When adding features that call `window.tp`, guard access with optional chaining or runtime checks so the code works both in Electron and in Next dev.

- Tests and test config notes
  - Jest is configured for the renderer using `jsdom` and uses `babel-jest`/`ts-jest` as needed for TSX. See `jest.config.ts` and `babel.config.js` in the repo. Renderer unit tests live under `src/renderer/__tests__` and use the `jsdom` environment.

- Files to reference when making changes
  - Main process entry and wiring: `src/main/index.ts`
  - IPC handlers: `src/main/handlers/*.ts` and `src/main/handlers/index.ts`
  - Services and DB: `src/main/services/*.ts` (`manager.ts`, `data.ts`, `project.ts`, `company.ts`, `session.ts`, `task.ts`)
  - Preload / renderer bridge: `src/preload.ts`
  - Renderer (Next) entry: `src/renderer/app/page.tsx` and `src/renderer/*` pages/components
  - Dev stub & badge: `src/renderer/components/DevTPStub.tsx`, `src/renderer/components/DevBadge.tsx`
  - Build scripts and workflows: `package.json`, `scripts/make-icon.sh`

If anything here seems unclear or you'd like the AI instructions to include more examples (for example: test patterns, a new IPC addition template, or DB migration notes), tell me which section to expand and I'll iterate.
