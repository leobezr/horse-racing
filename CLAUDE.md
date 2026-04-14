# Claude Code Policy

This repository uses strict engineering guardrails.

- Canonical rules: `.opencode/RULES.md`
- Compliance checklist: `.opencode/CHECKLIST.md`
- Automated checks: `yarn guardrails`
- Lint: `yarn lint`
- Finish check: `yarn verify` (lint + typecheck + guardrails)

All implementations must be compliant before completion.
