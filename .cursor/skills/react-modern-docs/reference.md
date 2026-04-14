# React modern patterns — quick reference

## Primary docs

| Topic | URL |
|------|-----|
| React (current) | https://react.dev |
| Learn React | https://react.dev/learn |
| API reference | https://react.dev/reference/react |
| React Router | https://reactrouter.com |

## Hooks (prefer these over class lifecycles)

- State: `useState`, `useReducer`
- Context: `useContext`
- Refs: `useRef`, `useImperativeHandle` (sparingly)
- Memoization: `useMemo`, `useCallback` (when measured or clearly needed)
- Effects: `useEffect`, `useLayoutEffect`
- Identity / a11y: `useId`
- External stores: `useSyncExternalStore`

## Suspense (typical client uses)

- Wrap lazy routes or code-split chunks with `<Suspense fallback={...}>`.
- Align with framework docs for streaming / RSC (Next.js, etc.).

## Class components

- Avoid for new code.
- Keep when required for error boundaries or unmigrated islands; plan hook-based or framework alternatives when possible.

## React Router alignment

- Use the routing API that matches `package.json` (createBrowserRouter + RouterProvider vs older patterns).
- Prefer typed loaders/actions if the codebase already uses them.
