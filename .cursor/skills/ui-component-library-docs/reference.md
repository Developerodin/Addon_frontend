# UI libraries — documentation entry points

Use these URLs when verifying APIs. Prefer fetching the specific component page when the main site is large.

## Shadcn/ui (registry + patterns)

- Registry / docs: https://ui.shadcn.com/docs
- Individual components: https://ui.shadcn.com/docs/components/<name> (e.g. `button`, `dialog`)
- **Note:** Shadcn is copy-paste; **this repo’s generated files** under the project’s components path override generic web examples.

## Radix UI (primitives under many kits)

- Docs: https://www.radix-ui.com/primitives/docs/overview/introduction
- Per-component docs linked from the sidebar (e.g. Dialog, Select).
- **Note:** Shadcn components often wrap Radix — check both local `components/ui/*` and Radix docs for behavior.

## Material UI (MUI)

- Material UI (React): https://mui.com/material-ui/getting-started/
- Component API pages: https://mui.com/material-ui/api/<component-name>/ (e.g. `button`)
- **Version:** use the docs version selector to match `package.json` (`@mui/material` major).

## Ant Design

- Docs: https://ant.design/components/overview/
- **Version:** Ant Design v5 vs v4 APIs differ — match `antd` in `package.json`.

## Chakra UI

- Docs: https://chakra-ui.com/docs/components

## Headless UI

- Docs: https://headlessui.com/

## Preline UI (this repo may use)

- Docs: https://preline.co/docs/index.html
- **Note:** Often used with Tailwind + data attributes; verify HTML structure and JS plugins from Preline docs, not generic Tailwind-only patterns.

## React Aria / React Spectrum (Adobe)

- React Aria: https://react-spectrum.adobe.com/react-aria/
- Useful when the codebase uses `react-aria-components` or similar.

## Ground truth in the repo

| Source | When to use |
|--------|-------------|
| `package.json` dependencies | Confirms which library and major version |
| `node_modules/<pkg>/**/*.d.ts` | Exact `props` interfaces and union types |
| Local `components/ui/*.tsx` | Shadcn-style wrappers, `cn()`, variant helpers |
| Existing feature components | Naming and composition conventions |
