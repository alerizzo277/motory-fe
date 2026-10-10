# Motory Frontend

## Project Overview

Motory browser application for vehicle history and maintenance. Currently implements authentication/recovery pages and a protected placeholder home; vehicle screens are not implemented.

## Technology Stack

React 19, TypeScript 6, Vite 8, React Router 7, Apollo Client 4/GraphQL, plain CSS with semantic theme variables and bundled Inter font. Tests use Node's built-in runner and Playwright; lint uses ESLint with TypeScript, hooks and refresh rules. No formatter or GraphQL code generation is configured.

## Project Structure

- `src/main.tsx`, `src/App.tsx`: React entry and composition.
- `src/app/`: providers and browser routing/auth gates.
- `src/graphql/client/`: shared Apollo client and error helpers.
- `src/features/auth/`: pages, components, context/hook, token storage, validation, handwritten API operations/types.
- `src/features/home/`: protected placeholder home.
- `src/shared/components/`, `src/styles/`, `src/assets/`, `public/`: reusable presentation, theme and assets.
- `tests/`, `e2e/`: Node helper tests and Playwright browser tests.

## Architecture

Feature-oriented SPA. Apollo wraps auth context; auth verifies stored tokens through `me`. Tokens persist in localStorage with subscription/cross-tab updates. Preserve current-session checks before clearing tokens/cache on unauthorized responses. Pages call typed handwritten GraphQL operations and translate backend extension codes into UI messages. Use existing plain CSS/components and validation helpers; inspect differences between forms before changing them.

## Development Commands

Run from this repository:

- Install: `npm ci` (lockfile) or `npm install`.
- Develop: `npm run dev`; explicit port: `npm run dev -- --port 5173 --strictPort`.
- Build/type check: `npm run build`; preview build: `npm run preview`.
- Lint: `npm run lint`.
- Unit tests: `npm test` (requires Node supporting native TypeScript stripping).
- Browser tests: `npm run test:e2e`; browser setup if needed: `npx playwright install chromium`, or configure `PLAYWRIGHT_CHROME_PATH`.

Configure `VITE_GRAPHQL_URL` locally and align the frontend origin with backend CORS. Playwright starts its own Vite server and mocks GraphQL requests. Build type checking excludes Playwright tests/config. No Node runtime version is pinned.

## Repository Instructions

- Follow the existing architecture and patterns.
- Inspect relevant existing implementations before making changes.
- Avoid unnecessary abstractions and complexity.
- Prefer existing dependencies and native framework capabilities.
- Do not introduce new direct dependencies without explicit approval.
- Do not make unrelated changes.
- Do not expose or commit secrets or credentials.
- Keep modifications focused on the requested task.
- Do not modify AGENTS.md or project documentation unless explicitly requested.

## Code Formatting

- Use Prettier for code formatting.
- Follow the configuration defined in `.prettierrc.json`.
- After modifying source files, run Prettier only on the files changed during the task.
- Do not format unrelated files.
- Do not change Prettier configuration unless explicitly requested.

## Documentation

- `docs/project-analysis.md` contains a snapshot of the project architecture, structure, workflows, and known inconsistencies.
- `docs/reports/` contains historical reports of completed development tasks.
- Consult `docs/project-analysis.md` when additional architectural context is needed.
- Consult relevant reports only when historical implementation context is necessary.
- `docs/conventions.md` defines the coding conventions and development practices that must be followed when implementing or modifying application code.
- Read and follow `docs/conventions.md` before implementing or modifying application code.
- Treat the source code as the source of truth when documentation is outdated.
- Do not create or modify documentation unless explicitly requested.
- Write all documentation in English.
