# Project Rule Base

These rules are mandatory for all code added or modified in this repository.

## 1) Non-negotiable engineering principles

- Apply Clean Code in naming, structure, and readability.
- Apply Clean Architecture boundaries (domain, application, infrastructure, UI).
- Apply SOLID in class/module/component design.
- Prefer KISS over clever implementations.
- Enforce YAGNI: do not build features before they are needed.

## 2) Architecture and module boundaries

- Business rules must not depend on framework details.
- Dependency direction must point inward to stable domain rules.
- UI, framework, and external service code must be replaceable adapters.
- Keep modules small, cohesive, and focused on one responsibility.

## 3) Configuration policy

- Hard-coded configuration is forbidden.
- No inline environment values in business logic or UI logic.
- Configuration values must come from dedicated config modules.
- Config modules must read from environment variables and expose typed values.

## 4) Type and logic separation

- Mixing type definitions with business logic is forbidden.
- Define shared types/interfaces in dedicated `types` modules/files.
- Keep runtime logic in service/use-case/component modules.
- Co-location is allowed only for tiny private types used by one module and no reuse expected.

## 5) Frontend component standards

- All component styles must follow BEM naming.
- Every interactive element and key assertion target must include `data-test` attributes.
- `data-test` names must be stable, semantic, and independent from visual text.
- Component structure, style, and state concerns must remain decoupled.

## 6) Simplicity and maintainability checks

- Prefer explicit code over magic abstractions.
- Remove dead code and unused abstractions immediately.
- Avoid deep nesting; favor guard clauses and small functions.
- Keep functions/components focused and short.

## 7) Definition of done (mandatory)

- New code follows this rule base with no exceptions.
- No hard-coded config values are introduced.
- Type definitions and logic are separated per this document.
- UI changes use BEM classes and include `data-test` attributes.
- Changes are understandable without implicit tribal knowledge.

## 8) Conflict resolution

If rules conflict, resolve in this order:

1. Security and correctness
2. Architecture boundaries (Clean Architecture + SOLID)
3. Simplicity (KISS)
4. Scope discipline (YAGNI)
5. Local style preferences

## 9) Package manager policy

- Use Yarn for local development and CI commands.
- Do not introduce npm-based workflow commands in docs, scripts, or examples.

## 10) Language, style, and workflow policy

- TypeScript is mandatory for application source files.
- Prefer arrow functions by default; use `function` declarations only when hoisting is explicitly required.
- Development flow is TDD-first: RED -> GREEN for new behavior and bug fixes.

## 11) UI and game boundary policy

- Website interface (Vue routes/components/layout) must live under `src/app`.
- Canvas/game engine logic must live under `src/game`.
- `src/app` may orchestrate and render game features, but core simulation and rendering behavior stays in `src/game`.

## 12) Folder architecture policy

- Use Layered Architecture with feature-based modularization for both app and game domains.
- Organize by feature first, then by layer (`domain`, `application`, `infrastructure`, `presentation`, `state` when needed).
- Avoid dumping cross-feature files into broad shared folders unless genuinely reusable.

## 13) Lint and completion policy

- ESLint configuration must be present and maintained (`eslint.config.js`).
- Every completion pass must run linting before finalizing work.
- Default finish command: `yarn verify` (runs lint + typecheck + guardrails).
