# IBKR Данъчен калкулатор — Claude guidance

## 1) Project overview

React 19 + Vite SPA deployed to GitHub Pages. The app parses Interactive Brokers **Activity Statement (CSV)** and **Trade Confirmation (HTML)** files entirely client-side, then calculates Bulgarian tax figures for the annual declaration.

**No server. No uploads. Everything runs in the browser.**

## 2) Stack

| Layer             | Choice                                            |
| ----------------- | ------------------------------------------------- |
| UI framework      | React 19                                          |
| Build             | Vite                                              |
| Component library | Material UI (MUI) v6                              |
| i18n              | i18next + react-i18next                           |
| Arithmetic        | Decimal.js                                        |
| Styling           | MUI `sx` + a single `index.css` for layout/tokens |

## 3) Core domain concepts

* **Activity Statement CSV** — IBKR export with open positions, instruments, IBKR-held cost basis, and prior trades.
* **Trade Confirmation HTML** — authoritative per-trade source for quantity, price, commissions, and fees.
* **Среднопретеглена цена** — weighted-average cost basis per symbol; this is the legally required method in Bulgaria.
* **BGN conversion** — non-BGN amounts are converted at the BNB rate for the exact trade date. EUR uses a fixed rate.
* **App5 / App13 split** — taxable gains go to Приложение №5 (Код 508); exempt gains from EU-regulated-market ETFs go to Приложение №13.
* **App8 Holdings** — all foreign positions held on 31 Dec must be declared, regardless of realised income.
* **App8 Dividends** — foreign dividends are taxed at 5%; foreign withholding tax is credited against Bulgarian tax owed.

## 4) Processing pipeline

```
Phase 1  readInput() → parse CSV + HTML → inputData
          ↓
         inferPriorPositions() → detect pre-year positions → pendingPositions
          ↓
         PriorYearPositionsForm → user reviews/edits cost basis + dates

Phase 2  calculate(inputData, priorPositions) → result
          ↓
         ResultTabs → Сделки / Позиции / Дивиденти / Лихви
```

## 5) Theming

Two themes are exported from `theme.js`:

* `dayTheme` (blue)
* `nightTheme` (purple `#9B6DE3`)

Both are built by `makeTheme(isDark)`.

`App.jsx` owns `nightMode` and passes the active theme into `ThemeProvider`. It also sets:

```js
 document.documentElement.dataset.theme = 'night' | 'day'
```

This allows `index.css` to override a small set of non-MUI styles (header gradient, dropzone, footer).

### Info-box colour pattern

All warning/info callout boxes must use `alpha()` callbacks so they adapt automatically to the active theme. Day values must stay exact.

```jsx
import { alpha } from '@mui/material/styles'

sx={{
  bgcolor: (theme) => theme.palette.mode === 'dark'
    ? alpha(theme.palette.warning.main, 0.10)
    : '#FFFBEB',
  borderColor: (theme) => theme.palette.mode === 'dark'
    ? alpha(theme.palette.warning.main, 0.25)
    : '#FCD34D',
}}

sx={{
  bgcolor: (theme) => theme.palette.mode === 'dark'
    ? alpha(theme.palette.primary.main, 0.10)
    : '#EFF6FF',
}}
```

Do not hardcode `#FFFBEB`, `#EFF6FF`, or `#FCD34D` in new code. Use the pattern above so future themes work automatically.

## 6) i18n rules

* All visible strings live in `src/i18n/locales/bg.json`.
* Components call `const { t } = useTranslation()` and use `t('key')`.
* Use `t('key', { returnObjects: true })` for arrays and structured content.
* Use `<Trans i18nKey="...">` only when JSX elements such as bold text or links must be embedded inside a translated sentence.
* `dropzoneInfo.js` is deleted. Dropzone info lives under `dropzoneInfo.csv.*` and `dropzoneInfo.htm.*`; pass `infoKey="csv" | "htm"`.

## 7) React 19 guidelines

### Hooks and composition

* Prefer `useActionState` over manual loading/error pairs for forms or async actions that produce a result.
* Use `useOptimistic` for instant UI feedback while async work is in flight.
* Use `use(promise)` inside components suspended by `<Suspense>` instead of `useEffect` + state for data fetching.
* Use `use(Context)` as the preferred form of context access where appropriate.
* In React 19, `ref` is a plain prop; `forwardRef` is not needed unless required for compatibility.
* `<Context>` is the preferred provider form; `<Context.Provider>` still works.

### Memoisation

* Do not add `useMemo` or `useCallback` pre-emptively.
* Keep components and hooks pure so the React Compiler can optimise safely.
* If the compiler is not enabled in a given path, keep memoisation only where profiling shows it matters.

### State

* Keep state as close as possible to where it is used.
* Use a single `useReducer` when several values change together.
* Do not store derived data in state. Compute it during render, or memoise only if it is truly expensive.

### Effects

* Use `useEffect` only for external synchronisation: DOM, timers, subscriptions, browser APIs.
* Do not use effects to transform data.
* Avoid fetch waterfalls in effects. Prefer router loaders, `use(promise)`, or a data library.
* Always clean up subscriptions and timers.
* Use the `cancelled` flag pattern when async work can outlive the component:

```js
useEffect(() => {
  let cancelled = false
  doAsync().then(result => {
    if (!cancelled) setState(result)
  })
  return () => {
    cancelled = true
  }
}, [dep])
```

### Async / transitions

* Wrap non-urgent updates in `startTransition`.
* Use `useDeferredValue` when a slower render should lag behind a fast-changing value.

### Forms

* Prefer `<form action={asyncFn}>` and `useFormStatus` where appropriate.
* For client-only forms, `useActionState(action, initialState)` replaces the old `useState` + `useEffect` + manual error pattern.

## 8) Performance

* Profile before optimising.
* Virtualise long lists instead of manually slicing large arrays.
* Lazy-load heavy routes with `React.lazy` + `<Suspense>`.
* Code-split large JSON imports when they affect initial bundle size.

## 9) MUI v6 rules

* Use `sx` for one-off styles.
* Extract to `styled()` only when the same variant appears in three or more places.
* Use theme callbacks `(theme) => value` for dynamic styling.
* Use `alpha(color, opacity)` from `@mui/material/styles` for transparent palette-derived colours.
* Keep MUI overrides in the theme (`makeTheme`) instead of scattering them through components.
* `grey.50` / `grey.100` have semantic meaning in this project and should not be used as generic grey.

## 10) File and module organisation

* One component per file. The filename should match the component name.
* Keep domain logic in `src/domain/` and `src/pipeline/` with no React imports.
* Keep UI-only utilities in `src/utils/`.
* Avoid barrel files (`index.js` re-exports) because they hurt tree-shaking and HMR.

## 11) Code style

* Comments should explain **why**, not **what**.
* Use named exports for utilities and types.
* Use default exports for components.
* Pick one component declaration style and stay consistent.
* Use `Decimal.js` for all financial arithmetic. Do not rely on native `Number` for calculations that can accumulate rounding error.

## 12) Unit testing

### Framework

* Use Vitest.
* Do not introduce Jest unless explicitly requested.
* Tests must run via `npm test`.

### Scope

Test business logic only:

* parser functions in `src/domain/parser`
* tax calculation logic and strategies

Do not test:

* UI components
* styling
* trivial rendering

### Structure

* Place tests next to code or under `src/__tests__/`.
* Use `*.test.js` naming.

### Quality

Tests must verify real behaviour and cover:

* normal cases
* edge cases
* invalid input

Avoid meaningless assertions and implementation-detail tests.

### Determinism

* Tests must be deterministic.
* No randomness.
* No network calls.

### Mocking

* Use Vitest mocking via `vi`.
* Mock only external dependencies.

### Coverage priority

* tax calculations
* parsing correctness

## 13) Git workflow

### Branching

* Always create a new branch for each issue.
* Always branch from `master`.
* Never commit directly to `master`.

### Branch naming

Use one of these formats:

* `feature/<short-description>`
* `fix/<short-description>`
* `refactor/<short-description>`

Examples:

* `feature/pdf-support`
* `fix/tax-classification`
* `refactor/strategy-pattern`

### Process

1. `git checkout master`
2. `git pull`
3. `git checkout -b <branch-name>`
4. Implement the change
5. Commit with a meaningful message
6. Open a PR into `master`

### PR requirements

Any PR that changes logic must:

* reference the issue
* include or update tests
* not break existing tests
* pass `npm test`

### Anti-patterns

* mixing Jest and Vitest
* testing UI instead of logic
* writing tests without assertions
* copy-pasting tests without understanding the logic
