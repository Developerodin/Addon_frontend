---
name: ui-component-library-docs
description: Grounds React UI code in official component library documentation and local types so props, slots, and APIs match reality. Use when using or importing Shadcn/ui, Radix UI, MUI (Material UI), Ant Design, Preline, Headless UI, Chakra UI, or when the user asks for components, props, variants, or theming from a UI kit.
---

# UI component library docs (no invented props)

## Rules

1. **Do not invent component props, events, or slot names.** Infer the public API only from official docs, this repo’s installed packages, or TypeScript definitions shipped with the library.
2. **Discover what is actually installed.** Read the project `package.json` and grep imports (`from "@mui/…"`, `from "antd"`, `from "@/components/ui/…"`, etc.) before assuming a stack.
3. **Resolve uncertainty by reading sources**, in this order when possible:
   - Official documentation for the component (see [reference.md](reference.md) for entry URLs).
   - **Type definitions** in `node_modules/<package>/**/*.d.ts` (or the package’s `dist` types) for the exact prop interface.
   - **Local Shadcn-style components**: read the file under `components/ui/` (or the project’s alias path) — those files are the source of truth for props and re-exports.
4. **Version-aware behavior.** Major versions differ (MUI v5 vs v6, Ant Design v4 vs v5, etc.). Confirm the installed semver in `package.json` and open the matching doc version if the site offers a version switcher.

## Workflow

1. **Identify the library and component** from imports or the user request.
2. **If the package is in `package.json`**: open the relevant doc page or the `.d.ts` for that component before writing JSX.
3. **If multiple UI libraries exist** in the same repo: use the one already used in the surrounding file or feature folder; do not mix unless the user asks.
4. **For composable primitives** (Radix, Headless UI, Shadcn patterns): verify **root vs part** components (`Trigger`, `Content`, `Item`) and **required structure** from docs — wrong composition often looks valid but breaks a11y or behavior.
5. **After generating code**, mentally diff props against the doc/type list; remove or rename anything not listed.

## Anti-patterns

- Copying prop names from another design system (e.g. MUI `color` on an Ant Design `Button`).
- Assuming Shadcn “CLI defaults” without reading the **checked-in** component source in this repo.
- Guessing event names (`onOpen` vs `onOpenChange`, etc.) instead of checking docs/types.
- Using deprecated APIs without checking the library’s migration guide for the installed major version.

## Relationship to other project skills

- Tailwind-specific utilities: use the project **tailwind-css-docs** skill.
- General React patterns: use **react-modern-docs**.

## Additional resources

- Doc URL index and notes: [reference.md](reference.md)
