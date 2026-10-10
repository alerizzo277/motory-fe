# Frontend Project Analysis

## 1. Project Overview

This repository is Motory's browser application. The implemented interface supports registration, login, email verification, verification resend, forgotten-password requests, password reset and a protected placeholder home screen. Vehicle history and maintenance screens are not implemented. It is an independent npm/Git repository, with no parent workspace configuration.

This snapshot was inspected on 9 October 2026. Confirmed findings come from source, dependency manifests, configuration and tests. Section 8 separates observations and suggestions from implemented behavior. Existing README/phase documents describe earlier iterations and can differ from the current source.

## 2. Technology Stack

The application uses TypeScript/TSX, CSS and static image/SVG assets. Tooling includes JavaScript ESM configuration and `.mjs` tests. The package is ESM. Exact versions below were checked in both `package-lock.json` and local `node_modules`; those versions match. Manifest ranges are not installed versions.

| Package | Manifest range | Locked / installed version | Responsibility |
| --- | --- | --- | --- |
| `react` | `^19.2.8` | 19.3.0 | Function components, hooks and context |
| `react-dom` | `^19.2.8` | 19.3.0 | Browser root rendering |
| `react-router-dom` | `^7.18.4` | 7.18.4 | Client routing and route gates |
| `@apollo/client` | `^4.3.1` | 4.3.1 | GraphQL HTTP client, React hooks and normalized cache |
| `graphql` | `^16.14.2` | 16.14.2 | GraphQL dependency used by Apollo operations |
| `rxjs` | `^7.8.2` | 7.8.2 | Apollo reactive dependency; no direct application import found |
| `@fontsource-variable/inter` | `^5.3.0` | 5.3.0 | Bundled variable Inter font |
| `vite` | `^8.3.0` | 8.3.2 | Development server and production bundler |
| `@vitejs/plugin-react` | `^6.1.1` | 6.1.1 | React Vite integration |
| `typescript` | `~6.0.2` | 6.0.3 | Type checking |
| `eslint` | `^10.10.0` | 10.12.0 | Lint runner |
| `@eslint/js` | `^10.0.1` | 10.0.1 | Recommended JavaScript rule set |
| `typescript-eslint` | `^8.69.0` | 8.71.0 | TypeScript lint integration |
| `eslint-plugin-react-hooks` | `^7.1.1` | 7.1.1 | Hook rules |
| `eslint-plugin-react-refresh` | `^0.5.6` | 0.5.7 | Vite refresh rules |
| `globals` | `^17.12.0` | 17.13.0 | Browser lint globals |
| `@playwright/test` | `^1.63.0` | 1.63.0 | Browser workflow tests |

React/DOM and Node type declarations come from `@types/react`, `@types/react-dom` and `@types/node`. No Node runtime or npm version is pinned by `engines`/`packageManager`. npm usage is supported by the scripts and committed lockfile.

There is no frontend database/ORM. Apollo performs GraphQL requests over HTTP with an `InMemoryCache`. No REST client, subscription link, Redux, form library, GraphQL code generator, Tailwind or CSS-in-JS framework is configured in this repository. There is no formatter dependency/configuration or formatting script. The unit runner is Node's built-in `node:test`, not Vitest or Jest.

## 3. Project Structure

| Location | Responsibility |
| --- | --- |
| `index.html`, `src/main.tsx` | Browser entry, React root, StrictMode, font and global stylesheet imports. |
| `src/App.tsx` | Composes providers and router. |
| `src/app/providers/` | Apollo and auth provider composition. |
| `src/app/router/` | BrowserRouter route declarations and auth route gates. |
| `src/graphql/client/` | Apollo HTTP/auth/error links and GraphQL error helpers. |
| `src/features/auth/` | Auth context, token storage, validation, pages, components, hook, handwritten types and GraphQL operations. |
| `src/features/home/pages/` | Protected placeholder home and logout. |
| `src/shared/components/` | Reusable brand logo and associated CSS. |
| `src/styles/theme.css`, `src/index.css` | Semantic CSS variables and global layout/control styling. |
| `src/assets/` | Brand assets, hero image and remaining starter SVG assets. |
| `public/` | Static favicon/icon assets. |
| `tests/` | Node unit tests of error, token and registration helpers. |
| `e2e/` | Playwright auth browser tests with intercepted GraphQL responses. |
| `docs/` | Existing authentication phase documentation and this analysis. |
| `dist/`, `node_modules/`, `test-results/` | Local generated output, dependencies and browser-test artifacts. |

Configuration lives in `vite.config.ts`, `eslint.config.js`, `playwright.config.ts`, `tsconfig.json`, `tsconfig.app.json` and `tsconfig.node.json`. `src/vite-env.d.ts` supplies Vite environment typing. No Vite backend proxy or custom aliases are configured.

## 4. Architecture Overview

The app is a client-rendered SPA with feature-oriented folders. `main.tsx` renders `App` in StrictMode. `AppProviders` nests `AuthProvider` inside `ApolloProvider`, then `AppRouter` creates the browser router. Auth state therefore does not depend on router hooks.

The shared Apollo client requires `VITE_GRAPHQL_URL`. Its auth link reads the current localStorage token for each request and supplies a bearer header. Its error link handles `UNAUTHENTICATED` only when the failed request belongs to the current token, preventing an old session response from clearing a newer login. Token removal also clears the cache.

`AuthProvider` observes the token store through `useSyncExternalStore`. A token-keyed `AuthSession` remounts on session changes. It verifies identity using a network-only `me` query; a stored token alone does not establish authenticated state. Login performs a no-cache mutation, clears the store and saves the access token. Logout removes the local token and clears Apollo state. Storage events synchronize other tabs. Session query errors present retry/logout controls.

GraphQL documents in the auth feature are handwritten `gql` operations with `TypedDocumentNode` types. There is no generated schema/types pipeline. Pages invoke Apollo directly; there is no generalized service or repository layer. Forms use local React state, native controls and shared validation helpers. Registration success leads to verification instructions, not automatic login. Delivery warnings are distinct from registration failure. Verification handles StrictMode effect replay by sharing the in-flight request promise.

Routing includes `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password` and `/home`. Login/register are guest-only; home is protected. Verification/recovery routes are public. Root and unmatched paths redirect to home, where route gating resolves the session.

## 5. Main Modules and Responsibilities

- **App providers/router:** provider composition, session loading UI, guest/protected access and redirects.
- **GraphQL client:** endpoint selection, authorization headers, cache and current-session error handling. Error helpers inspect `extensions.code` and translate validation field names into safe UI messages.
- **Auth context/storage/hook:** authenticated user state, login/logout and same-tab/cross-tab token subscriptions. `useAuth` checks that it is used under its provider.
- **Auth API/types:** seven backend operations (`login`, `me`, `register`, `verifyEmail`, `resendVerificationEmail`, `forgotPassword`, `resetPassword`) and handwritten inputs/results/warnings.
- **Auth pages/validation:** form state, trim-only outgoing names/email, password confirmation, field errors, token-link processing and recovery outcomes. Password contents are preserved.
- **Auth components:** shared branded layout, password visibility control and verification resend cooldown/warning feedback.
- **Home/shared/styles:** placeholder account view, brand logo, semantic CSS tokens, responsive plain CSS and bundled Inter font.

## 6. Development Workflow

Run commands from `motory-fe/`. Scripts and supported options were inspected; this documentation task did not install dependencies or execute application checks.

| Command | Current purpose / prerequisites |
| --- | --- |
| `npm install` / `npm ci` | Install dependencies; `npm ci` uses the lockfile. |
| `npm run dev` | Start Vite development server. |
| `npm run dev -- --port 5173 --strictPort` | Explicit development port, as documented in README. |
| `npm run build` | `tsc -b` type checks referenced projects, then Vite builds `dist/`. |
| `npm run preview` | Serve an existing production build locally. |
| `npm run lint` | Run `eslint .`; configured recommended rules target TS/TSX. |
| `npm test` | `node --test tests/*.test.mjs`. |
| `npm run test:e2e` | Run Playwright using `playwright.config.ts`. |
| `npx playwright install chromium` | Provision the browser if needed; alternatively set `PLAYWRIGHT_CHROME_PATH` to an existing compatible executable. |

Set `VITE_GRAPHQL_URL` locally (the code's error message directs users to `.env.local`); the backend must allow the frontend origin through CORS. No environment values are included here. The Vite endpoint is build-time client configuration, so it must not contain secrets.

Node tests import `.ts` source directly without a loader or compilation script. They require a Node runtime supporting native TypeScript stripping; the repository does not declare a minimum version. Unit tests cover code-based errors, token notifications/persistence, registration input validation and backend field-error translation, with browser globals mocked where needed.

Playwright starts Vite on a dedicated local port with a test GraphQL endpoint. Browser tests intercept GraphQL traffic; they do not require a running backend or database and do not establish full-stack integration. They cover verification, reset, login, resend warnings/cooldowns, blur/live validation, password visibility and narrow viewport layout. The TypeScript build references `src` and `vite.config.ts`; `e2e/` and `playwright.config.ts` are outside those compilation includes.

## 7. Existing Patterns and Conventions

- Feature pages/components use PascalCase filenames; hooks use `use...`; helpers and context/types use camelCase filenames. App composition is separated from features and shared presentation components.
- Named exports predominate; `App` is a default export. Components are functions using hooks, context and typed props. Type-only imports are used for erased types.
- App TypeScript is strict, targets ES2023, uses bundler resolution, `react-jsx`, no emit, unused-code checks and erasable syntax. There are no custom path aliases; imports are relative.
- Import extension usage varies: most application imports omit extensions, entry/helper-test imports sometimes use `.tsx`/`.ts`. Multiline and compressed one-line layouts coexist; no automatic formatting convention is configured.
- Plain CSS uses semantic custom properties and descriptive class names such as `auth-form__...`; feature/component styles sit with their components. Global card/control styles are shared.
- Registration/reset/password controls use blur-triggered validation and live correction; native browser validation is also used in other forms. Submission guards use refs in several pages, while login uses state. These are existing differences rather than a uniform form abstraction.
- Application errors are translated using GraphQL codes, not arbitrary backend message text. Validation fields are mapped to known UI labels/messages. Warning feedback and form failures are separate states.
- Labels, status/alert roles, `aria-invalid`, descriptions and password visibility buttons provide accessibility cues. Product copy and most tests/comments are Italian; code identifiers are largely English.

## 8. Observations and Potential Improvements

These are observations or suggestions for future work; none are implemented here.

1. **Limited product surface (confirmed):** authenticated home is a placeholder. Vehicle/maintenance capabilities only exist in the backend schema, not this UI.
2. **Historical documentation drift (confirmed):** README still describes Auth 1A and asks for backend CORS changes already present in the sibling backend. Future documentation consolidation should follow actual code.
3. **Handwritten API contract (confirmed):** documents, result types and error-code unions are maintained manually. The frontend union includes `FORBIDDEN`, which the current backend application error union does not expose. Consider contract/type generation only when it materially helps; current backend tests already validate these operations against its schema.
4. **Test scope (confirmed):** browser tests mock GraphQL and Node tests focus on helpers. Consider dedicated session race/cross-tab coverage and a small real full-stack test flow as the app grows.
5. **Type-check boundary (confirmed):** Playwright test/config files are linted as TS but excluded from build TypeScript projects. Consider an explicit test-tooling type check in a future iteration.
6. **Runtime reproducibility (confirmed):** direct `.ts` test imports need compatible Node support, but no runtime/package-manager version is pinned. Document and verify a supported runtime before standardizing setup.
7. **Session lifecycle (confirmed):** bearer tokens persist in localStorage; there is no refresh flow or proactive expiry timer. Unauthorized responses clear matching sessions, and storage changes synchronize logout. Reassess storage and lifecycle design against future requirements.
8. **Consistency (confirmed):** formatting/import styles and form validation/submission techniques vary. Any future convention or abstraction should be deliberate and proportionate rather than inferred by this initial documentation.
