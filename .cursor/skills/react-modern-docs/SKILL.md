---
name: react-modern-docs
description: Implements React using current React 18+ guidance from react.dev and React Router from reactrouter.com—function components, hooks, Suspense, concurrent features, and framework-specific Server Components. Use when writing or refactoring React/Next.js UI, choosing data-fetching or routing patterns, or when class components or legacy lifecycle APIs appear.
---

# React 18+ and modern routing

## Authority order

1. **React**: Prefer behavior and APIs documented on [react.dev](https://react.dev) over blog posts, old Stack Overflow, or pre-18 tutorials.
2. **React Router**: Prefer [reactrouter.com](https://reactrouter.com) for routing, loaders, actions, and data APIs (version must match the project’s installed package).

When unsure about an API, open the matching doc section rather than guessing.

## Defaults (client UI)

- **Components**: Function components only. Do not add new class components unless the user explicitly requires legacy interop.
- **State and effects**: `useState`, `useReducer`, `useContext`, `useRef`, `useMemo`, `useCallback`, `useEffect`, `useLayoutEffect`, `useId`, `useSyncExternalStore` as documented on react.dev—not patterns copied from pre-hooks codebases.
- **Side effects**: Prefer `useEffect` / event handlers; avoid deprecated lifecycle equivalents (`componentDidMount`, etc.).
- **Error boundaries**: Use class components only for `componentDidCatch` where needed, or follow the framework’s documented error-boundary pattern (e.g. Next.js `error.tsx`). Do not invent ad hoc “try/catch around render” as a substitute.
- **Suspense**: Use for lazy-loaded UI (`React.lazy` + `Suspense`) and for boundaries that the team’s React version and framework officially support. Do not assume Suspense for arbitrary data fetching unless the stack docs say so.

## Server Components and frameworks

- **Next.js App Router** (and similar): Follow the framework’s split between Server and Client Components (`"use client"` only where needed). Prefer server-side data fetching and passing serializable props to clients when that matches the project.
- Do not mix Server-only APIs into client components; do not treat RSC as “always client.”

## React Router

- Match the installed major version (v6+ vs v7) to the docs on reactrouter.com.
- Prefer route modules / data APIs (`loader`, `action`, `defer`, etc.) when the project already uses them; do not introduce conflicting patterns (e.g. old `Switch` / static `component` route config) unless migrating deliberately.

## Anti-patterns to avoid

- New class components for ordinary UI.
- `UNSAFE_` lifecycle methods or legacy context APIs unless maintaining old code.
- Copy-pasting patterns from create-react-app-only tutorials that omit current React or framework guidance.
- Teaching “default export a class” as the primary React model.

## When editing existing legacy code

- Prefer incremental migration: extract hooks, convert to functions, preserve behavior.
- If a class must stay temporarily, document why (e.g. error boundary only).

## Additional reference

For a compact checklist and link map, see [reference.md](reference.md).
