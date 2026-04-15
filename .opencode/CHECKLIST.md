# Rule Compliance Checklist

Use this checklist before finalizing any task.

## Architecture and design

- [ ] Change respects Clean Architecture boundaries.
- [ ] Modules follow SOLID and single responsibility.
- [ ] Solution is simple (KISS) and avoids speculative scope (YAGNI).
- [ ] Architecture decisions were handled in `orchestrator` context.
- [ ] In `orchestrator` context, event-driven callbacks are avoided outside Vue components.
- [ ] Dependency direction remains inward to domain rules.

## Configuration

- [ ] No hard-coded config values added.
- [ ] Configuration is centralized in config modules.

## Types and logic

- [ ] Shared types are separated from runtime logic.
- [ ] Logic modules do not become type-dump files.

## Frontend implementation

- [ ] Component classes follow BEM.
- [ ] Key elements include stable `data-test` attributes.
- [ ] Test selectors are semantic and not text-coupled.
- [ ] Vue component role is explicit: `Orchestrator` or `Component`.
- [ ] Orchestrator component only composes/glues existing components.
- [ ] Each component has one feature concern (SOLID/SRP).

## Code quality

- [ ] Naming is explicit and intention-revealing.
- [ ] No dead code, duplicated logic, or unnecessary abstractions.
- [ ] Changes are understandable and maintainable.
- [ ] No one-liner function/control-flow implementations were introduced.
- [ ] Ternary usage is only for simple single-line value selection.
- [ ] Functions stay within 30 lines (excluding comments and blank lines).
- [ ] Function design preserves clear separation of concerns.
- [ ] Non-trivial exported functions/methods include JSDoc focused on why.

## Tooling

- [ ] Yarn is used for install, run, and build/test commands.
- [ ] No npm command usage added to project docs or automation.
- [ ] Lint passes (`yarn lint`) before completion.
- [ ] Final verification run (`yarn verify`) before handing off work.

## Language and workflow

- [ ] Source changes use TypeScript.
- [ ] Arrow functions are preferred unless hoisting is required.
- [ ] TDD RED -> GREEN flow is followed for new behavior and fixes.
- [ ] RED phase existed first (failing test before production change).
- [ ] REFACTOR phase preserved behavior with tests kept green.
- [ ] Implementation changes were executed in `developer` context.

## Testing and coverage gates

- [ ] Tests were executed for the change.
- [ ] Targeted tests were used during RED/GREEN loops.
- [ ] Full suite was run before final handoff.
- [ ] Coverage report run with `yarn test:run --coverage`.
- [ ] Coverage is 100% for lines, statements, functions, and branches.
- [ ] No handoff occurs if tests fail or coverage is below 100%.

## Boundaries and structure

- [ ] UI/routes/components live under `src/app`.
- [ ] Canvas/game logic lives under `src/game`.
- [ ] Feature modules follow layered architecture (`domain`, `application`, `infrastructure`, `presentation`, `state` as needed).

## Placement and reuse scope

- [ ] Usage scope was checked before using `shared`.
- [ ] App-only modules remain near `src/app` consumers.
- [ ] Game-only modules remain near `src/game` consumers.
- [ ] `shared` is used only for true cross-boundary reuse (app + game) or justified multi-context reuse.
- [ ] YAGNI respected: no premature centralization.

## Flux store exception

- [ ] Pinia stores are centralized in `src/shared/pinia`.
- [ ] No feature-local Pinia stores exist under `src/app/features/*`.
- [ ] No feature-local Pinia stores exist under `src/game/features/*`.
