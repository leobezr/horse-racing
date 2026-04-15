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
- One-liner implementations are forbidden for function bodies and control-flow blocks; use explicit multi-line blocks.
- Ternary expressions are forbidden unless the full expression is a simple value selection that fits on a single line.

## 11) UI and game boundary policy

- Website interface (Vue routes/components/layout) must live under `src/app`.
- Canvas/game engine logic must live under `src/game`.
- `src/app` may orchestrate and render game features, but core simulation and rendering behavior stays in `src/game`.

## 12) Folder architecture policy

- Use Layered Architecture with feature-based modularization for both app and game domains.
- Organize by feature first, then by layer (`domain`, `application`, `infrastructure`, `presentation`, `state` when needed).
- Avoid dumping cross-feature files into broad shared folders unless genuinely reusable.

## 13) Module placement and YAGNI policy

- Before placing a file in `shared`, verify actual usage scope.
- If code is used only by `src/app`, keep it under `src/app` close to the consuming feature/module.
- If code is used only by `src/game`, keep it under `src/game` close to the consuming feature/module.
- Move code to `shared` only when it is used by both app and game (or multiple bounded contexts) and duplication would be worse.
- Treat premature centralization as a YAGNI violation.

## 14) Flux store exception policy

- Flux-pattern stores (Pinia) are a deliberate exception to local-first placement.
- Pinia stores must be centralized under `src/shared/pinia` as the application source-of-truth layer.
- Do not create feature-local Pinia store folders under `src/app/features/*` or `src/game/features/*`.

## 15) Lint and completion policy

- ESLint configuration must be present and maintained (`eslint.config.js`).
- Every completion pass must run linting before finalizing work.
- Default finish command: `yarn verify` (runs lint + typecheck + guardrails).

## 16) Testing and coverage gate policy

- Testing strategy is TDD-first and mandatory.
- Follow RED -> GREEN -> REFACTOR for all new behavior and bug fixes:
  - RED: write or update a failing test first.
  - GREEN: implement the smallest production change required to pass.
  - REFACTOR: improve structure without behavior changes while tests remain green.
- Do not implement production changes before a failing test exists.
- Do not skip the RED phase.
- Run targeted tests during RED/GREEN loops, then run the full suite before finalization.
- Coverage is a hard gate at 100% for lines, statements, functions, and branches.
- Finalization is blocked if tests were not run, any test fails, or coverage is below 100%.
- Default coverage validation command: `yarn test:run --coverage`.

## 17) Context switcher policy

- Two execution contexts are mandatory: `orchestrator` and `developer`.
- `orchestrator` context is triggered by architecture decisions (layering, boundaries, module placement, cross-feature integration, or dependency direction changes).
- In `orchestrator` context, always enforce Clean Architecture practices and explicit layer boundaries.
- In `orchestrator` context, event-driven callbacks are forbidden outside Vue component boundaries.
- Callback-based event wiring is allowed only inside Vue components under `src/app` presentation layer.
- Domain, application, and infrastructure layers must prefer explicit use-case/service APIs over event-callback orchestration.

## 18) Developer context implementation policy

- `developer` context is implementation-focused and TDD-first by default.
- Apply RED -> GREEN rigorously before refactoring.
- Maintain 100% coverage for lines, statements, functions, and branches.
- Functions must be easy to read, cohesive, and separated by concern.
- Functions should be limited to 30 lines (excluding comments and blank lines).
- Use JSDoc on non-trivial exported functions/methods to explain intent and rationale (`why`), not mechanics (`what`).

## 19) Vue component architecture policy

- Vue components are split into two explicit types: `Orchestrator` and `Component`.
- `Orchestrator` components compose existing components and coordinate data flow only.
- `Orchestrator` components must not contain feature-specific rendering logic that belongs to leaf components.
- `Component` files must implement one feature concern only (single responsibility).
- Keep business/domain logic out of Vue components; use application/domain services for behavior.
- Prefer naming that makes role explicit (example: `RaceBoardOrchestrator.vue`, `RaceBoardTableComponent.vue`).
