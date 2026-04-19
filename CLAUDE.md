#  IBKR Данъчен калкулатор — Claude guidance

## Project overview

React 19 + Vite SPA deployed to GitHub Pages. Parses Interactive Brokers
**Activity Statement (CSV)** and **Trade Confirmation (HTML)** files entirely
client-side, then calculates Bulgarian tax figures for the annual declaration.

**No server.** No uploads. Everything runs in the browser.

### Stack

| Layer | Choice |
|---|---|
| UI framework | React 19 |
| Build | Vite |
| Component library | Material UI (MUI) v6 |
| i18n | i18next + react-i18next |
| Arithmetic | Decimal.js (precision-critical tax math) |
| Styling | MUI `sx` + single `index.css` for layout/tokens |

### Key domain concepts

- **Activity Statement CSV** — IBKR export with open positions, instruments,
  IBKR-held cost basis, and prior trades.
- **Trade Confirmation HTML** — per-trade detail: quantity, price, commissions,
  fees. This is the authoritative trade source.
- **Среднопретеглена цена** — weighted-average cost basis per symbol, the
  legally required method in Bulgaria.
- **BGN conversion** — non-BGN value for cost basis is converted at the BNB (Bulgarian
  National Bank) rate for the exact trade date. EUR uses a fixed rate.
- **App5 / App13 split** — taxable gains go to Приложение №5 (Код 508);
  exempt gains from EU-regulated-market ETFs go to Приложение №13.
- **App8 Holdings** — all foreign positions held at 31 Dec must be declared regardless of realised income.
- **App8 Dividends** — foreign dividends taxed at 5%; foreign withholding tax
  is credited against Bulgarian tax owed.

### Processing pipeline (two phases)

```
Phase 1  readInput()        parse CSV + HTML → inputData
           ↓
         inferPriorPositions()  detect pre-year positions → pendingPositions
           ↓
         PriorYearPositionsForm  user reviews / edits cost basis + dates

Phase 2  calculate(inputData, priorPositions)  → result
           ↓
         ResultTabs  (Сделки / Позиции / Дивиденти / Лихви)
```

### Directory structure

```
src/
  App.jsx                 root — ThemeProvider, theme toggle, layout
  theme.js                makeTheme(isDark) factory → dayTheme / nightTheme
  index.css               design tokens (:root + [data-theme="night"]),
                          layout classes (only ~12 classes still used)
  main.jsx                StrictMode → <App />  (no ThemeProvider here)
  i18n/
    i18n.js               i18next init (Bulgarian default)
    locales/bg.json       all UI strings — ~150 keys
  components/
    AboutSection          3-card info + dialog
    DataTable             generic sortable table with copy-to-Excel
    Disclaimer            MUI Alert wrapper
    Dropzone              file drop/pick; reads infoKey from i18n
    PriorYearApproxWarning  warning when cost basis is estimated
    PriorYearPositionsForm  editable table for pre-year positions
    TaxApp5               Приложение №5 summary
    TaxApp13              Приложение №13 summary
    TaxApp8Holdings       Приложение №8 holdings table
    TaxApp8Dividends      Приложение №8 dividends table
    TaxFormSection        shared section wrapper (title bar + rows)
    TermsContent          terms of use text
  domain/
    constants.js
    fx/fxRates.js         BNB rate lookup by date; EUR fixed rate logic
    fx/rates/             2024.json  2025.json  2026.json
    tradeSummary.js       buildTradeTotals, buildTaxSummary
    parser/               CSV and HTML parsers
  pipeline/
    readInput.js          Phase 1 orchestration
    calculate.js          Phase 2 orchestration
  services/
    inferPriorPositions.js
  io/                     file read helpers
  utils/fmt.js            number formatting
```

---

## Theming

Two themes exported from `theme.js`: `dayTheme` (blue) and `nightTheme`
(purple `#9B6DE3`). Both built by `makeTheme(isDark)`.

`App.jsx` owns `nightMode` state and passes the active theme to
`<ThemeProvider>`. It also sets `document.documentElement`
`data-theme="night"|"day"` so the CSS-variable layer (`index.css`) can
override the handful of non-MUI styles (header gradient, dropzone, footer).

### Info-box colour pattern

All warning/info callout boxes use `alpha()` callbacks so they adapt to the
active theme automatically. Day values are preserved exactly:

```jsx
import { alpha } from '@mui/material/styles'

// amber warning box
sx={{
  bgcolor: (theme) => theme.palette.mode === 'dark'
    ? alpha(theme.palette.warning.main, 0.10)
    : '#FFFBEB',
  borderColor: (theme) => theme.palette.mode === 'dark'
    ? alpha(theme.palette.warning.main, 0.25)
    : '#FCD34D',
}}

// blue info box
sx={{
  bgcolor: (theme) => theme.palette.mode === 'dark'
    ? alpha(theme.palette.primary.main, 0.10)
    : '#EFF6FF',
}}
```

Never hardcode `#FFFBEB`, `#EFF6FF`, or `#FCD34D` in new code — use the
pattern above so any future theme works automatically.

---

## i18n rules

- **All visible strings live in `src/i18n/locales/bg.json`.**
- Components call `const { t } = useTranslation()` and use `t('key')`.
- Use `t('key', { returnObjects: true })` for arrays (steps, sections).
- Use `<Trans i18nKey="...">` only when JSX elements (bold, links) must be
  embedded inside a translated sentence.
- `dropzoneInfo.js` was deleted. Dropzone info content lives under
  `dropzoneInfo.csv.*` and `dropzoneInfo.htm.*`; pass `infoKey="csv"|"htm"`.

---

## React 19 best practices (2026)

### Hooks and composition

- Prefer `useActionState` (React 19) over manual loading/error state pairs for
  any form or async action that produces a result.
- Use `useOptimistic` for instant UI feedback while an async operation is
  in-flight. Revert automatically if the operation fails.
- Use `use(promise)` to unwrap promises inside a component suspended by
  `<Suspense>`. Avoids boilerplate `useEffect` + state combos for data
  fetching.
- Use `use(Context)` as a drop-in for `useContext` — it works inside
  conditionals and loops where hooks normally cannot appear.
- `ref` is a plain prop in React 19 — no `forwardRef` wrapper needed.
- `<Context>` is now a valid provider — `<Context.Provider>` still works but
  the shorter form is preferred.

### Memoisation

React Compiler (shipping with React 19 toolchains) handles most memoisation
automatically. Follow these rules:

- **Do not add `useMemo` / `useCallback` pre-emptively.** Let the compiler
  decide. Add them only after profiling shows a real problem.
- **Do** keep components and hooks pure (no side-effects during render) so the
  compiler can safely reorder renders.
- If you are in a codebase that has not yet enabled the React Compiler,
  continue to memoize expensive derived values (`useMemo`) and stable callback
  references (`useCallback`) when passed as props to heavy children.

### State

- Co-locate state: keep state as close to where it is used as possible.
  Lift only when two siblings genuinely need to share it.
- For complex state that involves multiple sub-values that change together,
  prefer a single `useReducer` over several `useState` calls.
- Avoid storing derived data in state. Compute it during render (or with
  `useMemo` if expensive). This project's `trades`, `taxSummary`, and
  `approxRows` are good examples of in-render derivation.

### Effects

- `useEffect` is for synchronising with external systems (DOM, timers,
  subscriptions, browser APIs). It is **not** for transforming data — do that
  during render.
- Effects that fetch data belong in the router loader, a `use(promise)` call,
  or a library like TanStack Query. Avoid `useEffect` fetch waterfalls.
- Always return a cleanup function when the effect sets up a subscription or
  timer. Use a `cancelled` flag pattern (as in this project's Phase 1 effect)
  to prevent setting state after unmount:

  ```js
  useEffect(() => {
    let cancelled = false
    doAsync().then(result => { if (!cancelled) setState(result) })
    return () => { cancelled = true }
  }, [dep])
  ```

### Async / Transitions

- Wrap non-urgent state updates (navigation, background recalculations) in
  `startTransition` so React can keep the UI responsive during the update.
- Use `useDeferredValue` to keep a fast version of a value for rendering while
  a slow re-render catches up.

### Forms

- React 19 `<form action={asyncFn}>` natively supports async server/client
  actions. Use `useFormStatus` inside the form to read pending state in child
  components without prop drilling.
- For client-only forms, `useActionState(action, initialState)` replaces the
  pattern of `useState` + `useEffect` + manual error handling.

### Performance

- **Profile before optimising.** Use the React DevTools Profiler to identify
  actual bottlenecks.
- Virtualise long lists (TanStack Virtual, MUI DataGrid virtual scroll) rather
  than windowing with manual slice state.
- Lazy-load heavy routes with `React.lazy` + `<Suspense>`.
- Large JSON imports (rate tables, translation files) should be code-split or
  fetched at runtime if they affect initial bundle size.

### MUI-specific (v6)

- Use `sx` prop for one-off styles. Extract to `styled()` only when the same
  variant is used in three or more places.
- Pass theme callbacks `(theme) => value` to `sx` when you need dynamic values
  that depend on palette/mode — this is the canonical way, no CSS-in-JS
  runtime cost.
- `alpha(color, opacity)` from `@mui/material/styles` is the correct way to
  create transparent palette-derived colours. Never hardcode `rgba()` values
  that should track a theme color.
- Keep MUI component overrides in the theme (`makeTheme`), not scattered in
  `sx` props across components.
- `grey.50` / `grey.100` in the theme are overridden to match the surface
  token system — do not use them as generic grey; they carry semantic meaning
  (surface / surface-container).

### File and module organisation

- One component per file. The filename is the component name.
- Domain logic (parsers, tax calculations, FX rates) lives in `src/domain/`
  and `src/pipeline/` — keep it free of React imports.
- UI-only utilities (formatting) live in `src/utils/`.
- Avoid barrel files (`index.js` re-exports) — they defeat tree-shaking and
  slow down HMR.

### Code style

- No comments that describe *what* the code does — names should do that.
  Comment only *why*: hidden constraints, legal references, workarounds.
- Default exports for components; named exports for utilities and types.
- Prefer `const` arrow functions for components:
  `export default function Foo()` is fine too — pick one per project and
  stay consistent.
- Financial arithmetic: always use `Decimal.js`. Native `Number` accumulates
  floating-point error across many trades.

### Unit Testing Guidelines

#### Framework

- Use Vitest as the default testing framework
- Do NOT introduce Jest unless explicitly requested
- All tests must run via:
  npm test

---

#### Scope of Testing

Focus on business logic only:

Test:

- Parser functions ("src/domain/parser")
- Tax calculation logic ("taxService", strategies)

Do NOT test:

- UI components
- Styling
- trivial rendering

---

#### Test Structure

- Place tests next to code or under:
  src/__tests__/
- File naming:
  *.test.js

---

#### Test Quality Requirements

Tests must:

- Verify real behavior (not superficial checks)
- Cover:
  - normal cases
  - edge cases
  - invalid input

Avoid:

- meaningless assertions (e.g. "expect(true).toBe(true)")
- testing implementation details

---

#### Example Expectations

Good:

expect(result.totalProfit).toBe(50)

Bad:

expect(result).toBeDefined()

---

#### Determinism

- Tests must be deterministic
- No randomness
- No reliance on external APIs or network

---

#### Mocking

- Use Vitest mocking:
  import { vi } from 'vitest'
- Mock only external dependencies (not core logic)

---

#### Coverage

- Prioritize:
  - tax calculations
  - parsing correctness
- Target meaningful coverage, not just % numbers

---

### Git Workflow Rules

#### Branching

- ALWAYS create a new branch for each issue
- ALWAYS branch from "master"
- NEVER commit directly to "master"

---

#### Branch naming

Use format:

feature/<short-description>
fix/<short-description>
refactor/<short-description>

Examples:

- "feature/pdf-support"
- "fix/tax-classification"
- "refactor/strategy-pattern"

---

#### Process

For every new issue:

1. Checkout latest master:
   
   git checkout master
git pull

2. Create new branch:
   
   git checkout -b <branch-name>

3. Implement changes

4. Commit with meaningful message

5. Open Pull Request into "master"

---

#### Restrictions

- Do NOT reuse old branches
- Do NOT commit unrelated changes in same branch
- One issue = one branch

---

#### PR Requirements

Any PR involving logic changes must:

- PR must reference the issue
- include or update tests
- not break existing tests
- run successfully with "npm test"

---

#### Anti-Patterns (Do NOT do)

- Mixing test frameworks (Jest + Vitest)
- Testing UI instead of logic
- Writing tests without assertions
- Copy-pasting tests without understanding logic