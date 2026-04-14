# Tailwind docs reference

## Canonical base

- Documentation root: https://tailwindcss.com/docs
- Installation / framework notes: https://tailwindcss.com/docs/installation

## High-traffic doc paths (append to `https://tailwindcss.com/docs/`)

| Topic | Path |
|-------|------|
| Configuration | `configuration` |
| Content paths | `content-configuration` |
| Dark mode | `dark-mode` |
| Responsive design | `responsive-design` |
| Hover/focus and states | `hover-focus-and-other-states` |
| Spacing (margin/padding) | `padding`, `margin`, `space` |
| Layout (flex/grid) | `flexbox-grid` → child pages `flex`, `grid`, etc. |
| Typography | `font-size`, `font-weight`, `text-color`, `line-height` |
| Colors | `colors`, `background-color`, `border-color` |
| Borders / radius / shadow | `border-width`, `border-radius`, `box-shadow` |
| Transitions / transforms | `transition-property`, `transform` |
| Arbitrary values | `adding-custom-styles` (and related) |
| Plugins (official) | e.g. `@tailwindcss/forms` — see Tailwind “Plugins” / plugin package docs |

Use `web_fetch` on the full URL when you need the exact class table or syntax for a page.

## Version alignment

1. Read `tailwindcss` in the project `package.json`.
2. **Tailwind v3** (typical for this repo): config-driven `tailwind.config.*`, `content`, `theme.extend`, `plugins`.
3. **Tailwind v4**: different setup (often CSS-first). If the project upgrades, re-check installation and config docs for that major version — do not mix v3 and v4 mental models without verifying.

## This repository

- Config file: `tailwind.config.ts` (or `.js`) at repo root — **read before** assuming default theme keys.
- Third-party UI (e.g. Preline) may add expectations; still validate core utilities against official Tailwind docs.
