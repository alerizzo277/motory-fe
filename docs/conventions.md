# Motory Frontend — Coding Conventions

These conventions apply to `motory-fe`. They complement `AGENTS.md` and the existing ESLint and Prettier configurations. Follow the current implementation where it is consistent with these rules; do not refactor unrelated code solely to enforce them.

## 1. General principles

- Prioritize consistency, readability, maintainability, and simplicity.
- Prefer existing project patterns and native React, TypeScript, and browser capabilities.
- Avoid speculative abstractions, unnecessary layers, and premature generalization.
- Keep changes focused on the requested task; do not rewrite unrelated code.
- Do not add direct dependencies without explicit approval. Do not upgrade unrelated packages.

## 2. Project organization

- Preserve the existing feature-oriented structure under `src/features/`.
- Keep feature-specific pages, components, hooks, API operations, types, and helpers within their feature.
- Use `src/app/` for app-level composition, providers, and routing; `src/graphql/client/` for shared Apollo configuration and cross-cutting GraphQL concerns.
- Move code to `src/shared/` only when it is genuinely reused across features.
- Do not create directories or files solely to satisfy a template. Avoid unnecessary coupling between features.

## 3. Naming

- Use **PascalCase** for React components, component files, interfaces, and type aliases (for example, `VehicleCard.tsx`, `VehicleCardProps`).
- Use **camelCase** for functions, variables, hooks, and utility files (for example, `formatMileage.ts`, `useVehicles`).
- Prefix custom hooks with `use`.
- Use **UPPER_SNAKE_CASE** for meaningful module-level constants and GraphQL operation constants where appropriate.
- Use lowercase **kebab-case** for multiword feature directories when creating new ones.
- Prefer descriptive names. Do not prefix interfaces with `I`.
- Match component-specific CSS filenames to the component or established local naming pattern.

## 4. TypeScript

- Use TypeScript for application logic and preserve strict type checking.
- Avoid `any`. Use `unknown` for genuinely unknown values and narrow them safely.
- Do not use unsafe casts or suppression comments merely to silence type errors.
- Type component props, GraphQL inputs/results, and other meaningful data contracts.
- Prefer `interface` for object-shaped contracts and component props; prefer `type` for unions and type compositions. This is guidance, not a rigid restriction.
- Use unions for constrained values and `import type` for type-only imports.
- Reuse existing types instead of creating competing definitions.

## 5. React components

- Use function components and React hooks.
- Give each component a clear primary responsibility. Extract components when it improves clarity or actual reuse, not to meet an arbitrary line limit.
- Prefer composition to large components with many configuration flags.
- Keep simple presentation logic in components; extract complex or reusable behavior into hooks when justified.
- Avoid unnecessary memoization (`useMemo`, `useCallback`, `memo`) without a clear reason.
- Follow React hook rules and preserve the existing authentication/session behavior.

## 6. State and effects

- Use `useState` for simple local state and `useReducer` when state transitions are genuinely complex.
- Use Context only for state that needs to be shared across an appropriate part of the tree; do not introduce additional global state libraries without approval.
- Let Apollo manage server data and its cache. Do not mirror GraphQL results in React state without a concrete need.
- Derive values during rendering when possible; avoid `useEffect` for derived state or logic that belongs in event handlers.
- Use effects for synchronization with external systems and ensure appropriate cleanup.

## 7. GraphQL and Apollo Client

- Use the existing Apollo Client for GraphQL communication. Keep shared client configuration centralized.
- Keep feature-specific queries and mutations in their feature's API area; give GraphQL operations explicit names.
- Follow the existing handwritten operation and TypeScript typing approach unless a change is expressly approved.
- Handle relevant loading, success, empty, and error states explicitly.
- Interpret application errors via stable GraphQL `extensions.code` values, not by matching backend message strings.
- Preserve session safety: do not clear newer authentication state in response to errors from older requests.
- Avoid extra API/service layers when direct, typed Apollo usage is sufficient.

## 8. CSS and visual consistency

- Use the project's existing plain CSS approach; do not introduce styling frameworks without approval.
- Reuse semantic variables from the Motory theme rather than hardcoding existing theme colors or duplicating design tokens.
- Keep feature- and component-specific styles near the related code where practical.
- Use descriptive class names and follow the existing lightweight BEM-like pattern (`block__element`, `block--modifier`) where useful.
- Avoid overly specific selectors and `!important` unless there is a justified need.
- Build layouts mobile-first and use responsive CSS with Flexbox/Grid as appropriate.
- Reuse existing brand assets and the established visual identity.

## 9. Errors and user feedback

- Do not silently swallow errors or leave empty `catch` blocks without a documented reason.
- Distinguish validation, application, authentication, and network failures when useful to the user.
- Present actionable, non-technical feedback; never expose internal details, secrets, or tokens.
- Preserve the existing separation between non-blocking warnings and operation failures.
- Do not leave temporary debugging `console.log` statements in delivered code.
- When internationalization is introduced, use translation keys for user-facing text rather than embedding new literals in components.

## 10. Comments and documentation

- Write code comments and technical documentation in English.
- Explain *why* non-obvious behavior exists; avoid comments that simply restate the code.
- Use JSDoc when it adds value to a non-obvious contract, not automatically for every function.
- Update comments affected by a change and remove obsolete ones.
- Do not create or modify documentation or historical reports unless explicitly requested.

## 11. Accessibility and responsive behavior

- Prefer semantic HTML and native controls.
- Associate labels with form fields; preserve keyboard usability and visible focus states.
- Use ARIA attributes when needed, without duplicating native semantics.
- Convey errors and status updates accessibly; do not rely only on color.
- Check small screens for overflow, adequate touch targets, and usable layouts.

## 12. Formatting and verification

- Treat `.prettierrc.json` as the source of truth for formatting and `eslint.config.js` as the source of truth for lint rules. Do not duplicate their individual options here.
- Run Prettier on **only the source files changed by the task**; do not format unrelated files.
- Use `npm run lint`, `npm run build`, and relevant tests when appropriate to the change.
- Do not disable lint rules or bypass TypeScript errors simply to make checks pass.
- Do not depend on editor format-on-save; formatting is an explicit development step.

## What not to enforce

Do not impose arbitrary file or component line limits, a custom hook for every GraphQL query, a fixed folder template for each feature, mandatory memoization, or additional architectural layers without a demonstrated need.

## 13. Internationalization

- Initialize i18next once in `src/i18n/index.ts`; use the standard `useTranslation()` hook in components.
- All user-visible text (including accessible labels and feedback) must use descriptive English translation keys. Avoid hardcoded text in React components.
- Keep bundled `common`, `auth`, and `validation` resources synchronized in Italian and English; every new key requires both translations.
- Translate application errors through stable backend codes and preserve field mapping. Store translation keys or structured results in state so visible feedback updates when language changes. Never expose backend messages.
- Resolve language from a supported stored preference, then the browser primary language subtag, then Italian. Persist only explicit selections through the centralized language helpers.
- Prefer native `Intl.DateTimeFormat` and `Intl.NumberFormat` with the selected language when formatting is needed. Do not add unnecessary i18n dependencies, detection plugins, or translation backends.

## 14. UI actions and icon buttons

- Prefer icon-only buttons for recognizable secondary actions such as edit, back, and delete; use descriptive text for primary actions such as creating or saving resources.
- Give every icon-only action an accessible name and a localized tooltip when appropriate. Do not rely on hover tooltips alone to communicate its purpose.
- Maintain touch-friendly targets of at least 44 × 44 CSS pixels, visible keyboard focus, and mobile-first responsiveness.
- Use consistent icon dimensions and spacing. Prefer existing icons or lightweight SVGs; do not introduce an icon library without explicit approval.
- Destructive actions must include appropriate confirmation when necessary.
