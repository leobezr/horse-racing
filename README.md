# horse-racing

## Run locally

- Install dependencies: `yarn`
- Start app dev server: `yarn dev`
- Start Storybook: `yarn storybook`
- Build Storybook static bundle: `yarn storybook:build`

## Engineering Rule Base

This project enforces a strict rule base in `.opencode`:

- Main rules: `.opencode/RULES.md`
- Delivery checklist: `.opencode/CHECKLIST.md`

All contributors and automation must follow these rules for every change.

## Guardrails

Run strict checks before finalizing work:

- `yarn guardrails`

## Lint and verification

- Lint: `yarn lint`
- Typecheck: `yarn typecheck`
- Full completion check (required before finish): `yarn verify`

This repository is fail-closed for rule compliance: if guardrails fail, changes are not considered complete.
