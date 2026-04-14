# Agent Instructions

All coding agents working in this repository must follow `.opencode/RULES.md` and `.opencode/CHECKLIST.md` with zero exceptions.

## Mandatory workflow

1. Read `.opencode/RULES.md` before proposing or applying changes.
2. Keep architecture boundaries explicit: `domain -> application -> infrastructure -> presentation`.
3. Use centralized configuration only (`src/config/*`).
4. Keep shared type definitions in dedicated type files/modules.
5. For frontend changes, enforce BEM classes and `data-test` selectors.
6. Run guardrail checks before finalizing: `npm run guardrails`.

## Fail-closed policy

- If a change cannot satisfy the rules, do not implement it.
- Never bypass or weaken a guardrail script to make a change pass.
- Prefer no change over a non-compliant change.
