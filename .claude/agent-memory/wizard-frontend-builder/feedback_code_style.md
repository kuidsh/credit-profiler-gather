---
name: feedback_code_style
description: Code style rules inferred from project setup and spec constraints
type: feedback
---

Follow these rules in all generated code for this project:

- No @anthropic-ai/sdk — it is not in package.json. Use fetch() directly to https://api.anthropic.com/v1/messages
- No Redux, Formik, styled-components, CSS Modules — keep it light
- Tailwind CSS classes directly in JSX — no custom CSS files
- All UI text in Spanish — labels, errors, placeholders, comments where user-facing
- Code comments in Spanish for non-obvious decisions
- Never use localStorage, sessionStorage, cookies, or console.log for user data
- Never mention bank names, financieras, or SOFOM in any output or UI text
- Never use approval language: "se aprueba", "es viable con X", etc.
- Minimum button height: 44px (min-h-[44px] Tailwind class) — mobile touch targets
- One export default per file

**Why:** These are hard constraints from CLAUDE.md and the functional spec (01-funcional.md). Violations would break the legal/commercial integrity of the tool and the user would need to fix them manually.

**How to apply:** Check every new file before writing. If SDK or persistence creeps in, remove it immediately.
