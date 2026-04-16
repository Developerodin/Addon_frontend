---
name: tailwind-css-docs
description: Grounds Tailwind utility suggestions in official documentation and the repo tailwind config. Fetches https://tailwindcss.com/docs when class names or behavior are uncertain. Use when writing or refactoring Tailwind classes, layout/spacing/color utilities, responsive variants, plugins (@tailwindcss/forms, etc.), or when the user mentions Tailwind, utility classes, or CSS in UI work.
---

# Tailwind CSS (official docs + local config)

## Rules

1. **Do not invent utilities.** Only use class names that exist in [Tailwind documentation](https://tailwindcss.com/docs) for the major version this project uses, or that are explicitly defined in this repo’s Tailwind config (theme extensions, plugins, safelist).
2. **Resolve uncertainty by reading docs.** If a utility name, variant prefix, or arbitrary-value syntax is not certain, open the relevant doc page (see [reference.md](reference.md)) via `web_fetch` or the browser MCP and confirm before suggesting code.
3. **Always reconcile with local config.** Before relying on default Tailwind theme values (breakpoints, colors, spacing, fonts), read the project’s `tailwind.config.ts` / `tailwind.config.js` — this repo often overrides defaults (for example custom `screens` and extended colors).

## Workflow

1. **Identify the topic** (e.g. flexbox, spacing, typography, dark mode, forms plugin).
2. **Check local config** at the repo root: `theme.extend`, `theme` overrides, `plugins`, `darkMode`, `content` paths.
3. **Confirm utilities on tailwindcss.com/docs** for that topic when:
   - Adding a class you have not seen elsewhere in the codebase
   - Using arbitrary values (`bg-[…]`, `w-[…]`)
   - Using variants (`md:`, `dark:`, `group-hover:`, etc.)
4. **Prefer existing project patterns** in `app/` and `shared/` for naming and composition; use docs to validate the underlying utilities, not to introduce one-off invented tokens.

## Anti-patterns

- Guessing scale steps (e.g. `gray-450`) or non-existent utilities.
- Assuming default Tailwind breakpoints when `theme.screens` is customized.
- Suggesting v4-only features (e.g. CSS-first config) when the project is on Tailwind v3 — verify in `package.json` if unsure.

## Additional resources

- URL index and version notes: [reference.md](reference.md)
