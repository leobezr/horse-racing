# horse-racing

## Run locally

- Install dependencies: `yarn`
- Start app dev server: `yarn dev`
- Start Storybook: `yarn storybook`
- Build Storybook static bundle: `yarn storybook:build`

## Snapshot tests (Storybook pipeline)

- Generate/verify Storybook visual snapshots locally: `yarn test:storybook:snapshots`
- In CI with GitHub Pages preview, point tests at deployed Storybook by setting `BASE_URL`:
  `BASE_URL=https://<org>.github.io/<repo>/ yarn test:storybook:snapshots`

## GitHub Pages pipeline (Storybook)

- Workflow: `.github/workflows/storybook-pages.yml`
- Trigger: push to `main` (or manual dispatch)
- Output URL format:
  `https://<github-username-or-org>.github.io/<repo-name>/`
- Snapshot pipeline uses this Pages URL automatically in:
  `.github/workflows/storybook-snapshots.yml`

### Docker workflow

- Generate/update snapshots in Docker:
  `docker compose -f docker-compose.snapshots.yml run --rm storybook-snapshots`
- Verify snapshots in Docker (without updating):
  `docker compose -f docker-compose.snapshots.yml run --rm storybook-snapshots yarn test:storybook:snapshots`

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
