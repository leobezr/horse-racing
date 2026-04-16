# Horse Racing

<p align="center">
  <img src="./public/assets/intro.gif" alt="Horse Racing intro animation" width="100%" />
</p>

<p align="center">
  <a href="https://github.com/leobezr/horse-racing/actions/workflows/app-pages.yml">
    <img src="https://github.com/leobezr/horse-racing/actions/workflows/app-pages.yml/badge.svg" alt="App Pages" />
  </a>
  <img src="https://img.shields.io/badge/Vue-3.5-42b883?logo=vue.js&logoColor=white" alt="Vue 3" />
  <img src="https://img.shields.io/badge/Vite-8.0-646cff?logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/TypeScript-6.0-3178c6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Cypress-E2E-17202c?logo=cypress&logoColor=white" alt="Cypress" />
</p>

Fast, deterministic horse racing simulator with betting rounds, visual race playback, Storybook-driven UI validation, and CI snapshot/e2e pipelines.

## Preview

[Click here to see the preview live](https://leobezr.github.io/horse-racing/)

## Quick Start

```bash
yarn
yarn dev
```

- App: `http://localhost:5173`
- Storybook: `yarn storybook` -> `http://localhost:6006`

## Scripts

### Core

- `yarn dev` - start Vite dev server
- `yarn build` - production app build
- `yarn preview` - preview built app

### Quality

- `yarn lint` - ESLint
- `yarn typecheck` - Vue TS typecheck
- `yarn test:run` - Jest tests (single run)
- `yarn verify` - lint + typecheck + tests + guardrails

### Storybook + Snapshots

- `yarn storybook` - run Storybook locally
- `yarn storybook:build` - build static Storybook
- `yarn test:storybook:snapshots` - validate Storybook snapshots
- `yarn test:storybook:snapshots:update` - update repo snapshot baselines
- `yarn test:storybook:snapshots:update:local` - update local-only snapshot baseline (`.local-snapshots`)
- `yarn test:storybook:snapshots:deployed-vs-local` - compare deployed GitHub Pages Storybook against local baseline

### Cypress e2e

- `yarn e2e:cypress` - run Cypress regression spec
- `yarn e2e:cypress:open` - open Cypress UI
- `yarn e2e:cypress:ci` - start app + run Cypress regression in CI mode

## Deployments

### GitHub Pages (App + Storybook)

- Workflow: `.github/workflows/app-pages.yml`
- Trigger: push to `master` (or manual dispatch)
- App URL: `https://<owner>.github.io/<repo>/`
- Storybook URL: `https://<owner>.github.io/<repo>/storybook/`

### Snapshot Verification

- Workflow: `.github/workflows/storybook-snapshots.yml`
- Trigger: after successful `App Pages` run
- Validates deployed Storybook against local snapshot baseline

### PR Validation

- Workflow: `.github/workflows/pr-validation.yml`
- Trigger: pull requests to `master`
- Checks: lint + tests + build

## Docker Snapshot Workflow

- Update local snapshot baseline:
  - `docker compose -f docker-compose.snapshots.yml run --rm storybook-snapshots`
- Validate snapshots without update:
  - `docker compose -f docker-compose.snapshots.yml run --rm storybook-snapshots yarn test:storybook:snapshots`

## Project Guardrails

This repo is fail-closed for rule compliance.

- Rules: `.opencode/RULES.md`
- Checklist: `.opencode/CHECKLIST.md`
- Guardrail command: `yarn guardrails`

If guardrails fail, changes are not considered complete.
