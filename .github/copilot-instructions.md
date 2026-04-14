# Copilot Instructions

Follow `.opencode/RULES.md` strictly.

- Do not introduce hard-coded config.
- Keep shared types separated from runtime logic.
- Keep architecture boundaries clean and dependency direction inward.
- For Vue components: use BEM classes and add `data-test` on interactive/key assertion elements.
- Ensure `npm run guardrails` passes before considering changes complete.
