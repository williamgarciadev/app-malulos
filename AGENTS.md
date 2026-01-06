# Repository Guidelines

## Project Structure & Module Organization
- `src/` holds the React + TypeScript frontend. Key areas: `components/`, `pages/`, `stores/` (Zustand), `services/` (API + tickets), `styles/`, and `types/` (shared types).
- `server/` contains the Express + SQLite backend. Entry point is `server/src/index.js`, with DB config in `server/src/config/` and models in `server/src/models/`.
- `public/` stores static assets served by Vite. `docs/` includes screenshots. `tasks/` is for internal notes.

## Build, Test, and Development Commands
- `npm install` installs frontend dependencies (run once). Then `cd server && npm install` for the API.
- `npm run init-db` initializes `server/malulos.db` and seeds data (destructive to existing data).
- `npm run dev` runs the frontend only; `npm run dev:server` runs the backend only.
- `npm run dev:all` runs both frontend and backend together (recommended).
- `npm run build` builds the frontend; `npm run preview` serves the build locally.
- `npm run lint` runs ESLint across the repo.

## Coding Style & Naming Conventions
- TypeScript is strict. Avoid `any` and keep types centralized in `src/types/index.ts`.
- Use CSS Modules for component/page styles (`Component.module.css`).
- Prefer path aliases for imports: `@/components/...` (configured in `vite.config.ts`).
- Keep React components and hooks in `PascalCase` filenames; stores and services in `camelCase`.

## Testing Guidelines
- No automated test runner is configured yet. Use manual smoke tests:
  - Login with PIN `1234`, open a cash session, create an order, and complete payment.
  - Verify Kitchen and Tables views update correctly.
- If adding tests, document the runner and naming rules in this file.

## Commit & Pull Request Guidelines
- Commits follow Conventional Commits style (e.g., `feat: ...`, `fix: ...`).
- PRs should include a short summary, testing steps, and screenshots for UI changes.
- If you change DB schema or seed data, mention whether `npm run init-db` is required.

## Configuration & Security Notes
- Configure backend URL via `.env`: `VITE_API_URL=http://localhost:3000`.
- Frontend runs on port `5174`, backend on `3000` in dev.
- Do not commit local SQLite data (`server/malulos.db`).
