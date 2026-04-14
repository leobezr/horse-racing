# Rule Compliance Checklist

Use this checklist before finalizing any task.

## Architecture and design

- [ ] Change respects Clean Architecture boundaries.
- [ ] Modules follow SOLID and single responsibility.
- [ ] Solution is simple (KISS) and avoids speculative scope (YAGNI).

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

## Code quality

- [ ] Naming is explicit and intention-revealing.
- [ ] No dead code, duplicated logic, or unnecessary abstractions.
- [ ] Changes are understandable and maintainable.

## Tooling

- [ ] Yarn is used for install, run, and build/test commands.
- [ ] No npm command usage added to project docs or automation.
