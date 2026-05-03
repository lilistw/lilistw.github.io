# IBKR Данъчен калкулатор — Claude guidance

## 1) Project overview

React 19 + Vite SPA deployed to GitHub Pages. The app parses Interactive Brokers **Activity Statement (CSV)** and **Trade Confirmation (HTML)** files entirely client-side, then calculates Bulgarian tax figures for the annual declaration.

**No server. No uploads. Everything runs in the browser.**

---

## 2) Stack

| Layer             | Choice                                      |
| ----------------- | ------------------------------------------- |
| UI framework      | React 19                                    |
| Build             | Vite                                        |
| Component library | Material UI (MUI) v9                        |
| i18n              | Custom `src/localization/translate.js`      |
| Arithmetic        | Decimal.js                                  |
| Parsing           | PapaParse                                   |
| Testing           | Vitest                                      |
| Styling           | MUI `sx` + `src/index.css` for shell/layout |

---

## 3) Core domain concepts

* **Activity Statement CSV** — IBKR export with positions, instruments, trades.
* **Trade Confirmation HTML** — authoritative trade source.
* **Среднопретеглена цена** — weighted-average cost basis (mandatory in BG).
* **BGN conversion** — BNB rate per trade date (EUR fixed).
* **App5 / App13 split** — taxable vs exempt gains.
* **Tax toggle** — user can manually move a trade between App5/App13 buckets.
* **App8 Holdings** — all foreign positions at 31 Dec.
* **App8 Dividends** — 5% tax with withholding credit.

---

## 4) Runtime flow

`src/app/hooks/useTaxAppController.js` owns page state and orchestration.
`src/app/App.jsx` is a thin composition shell.

```
User selects CSV + HTML
        ↓
useTaxAppController → fileReader(csvParser/htmlParser) → parseInput() → inputData
        ↓
inferPriorPositions() → pendingPositions
        ↓
PriorYearPositionsForm (user edits)
        ↓
calculateTax(inputData, priorPositions)
        ↓
ResultTabs (trades / holdings / dividends / interest)
```

`useTaxAppController` owns:

* theme mode (via `useThemeMode`)
* file selection and Object URL lifecycle
* parsing phase (async, cancellable)
* prior-position editing
* tax calculation trigger
* demo loading
* terms/modal state
* error and loading state

---

## 5) Architecture layers

### Hooks layer (`src/app/hooks/`)

Page-level state and commands. One hook per page workflow.

* `useTaxAppController` — the main app workflow hook
* `useThemeMode` — day/night toggle with persistence

No business logic. No direct browser API calls.

---

### Core layer (`src/core/`)

Pure pipeline — no browser APIs, no React. Safe to run on a server.

**`src/core/services/`** — use-case orchestration:

* `parseInput`
* `calculateTax`

**`src/core/parser/`** — parsing and input normalization:

* input parsers — accept strings or pre-parsed DOM objects
* `buildInputData` and `inferPriorPositions`

**`src/core/domain/`** — business logic:

* tax calculators (`tax/`) — `TradeCalculator`, `DividendCalculator`, `HoldingsCalculator`, `InterestCalculator`
* cost-basis strategies (`tax/costBasis/`) — `WeightedAverageCostBasisStrategy` (BG-law default), `IbkrCostBasisStrategy` (uses CSV value, falls back to weighted-average); `createCostBasisStrategy(name)` factory
* FX utilities (`fx/`)

No React imports. No browser globals. No localization calls (`t` is forbidden inside `src/core/`).

---

### Input layer (`src/app/input/`)

Browser adapters for parsing/validation before passing raw text/DOM into core.

* `fileReader.js` — reads `File` objects and orchestrates CSV/HTML extraction
* `csvParser.js` — wraps PapaParse
* `htmlParser.js` — wraps `DOMParser`
* `validateInput.js` — validates IBKR file content

---

### UI layer (`src/app/components/`)

All React components and output formatters. Passive — render props only, emit events.

* `AppHeader`, `AppFooter`
* `Dropzone`
* `CostBasisStrategySelector` — radio group for cost-basis strategy choice
* `PriorYearPositionsForm`
* `PriorYearApproxWarning` — warning when prior-year cost is approximated
* `ThresholdWarning` — warns when holdings exceed SPB8 EUR 25 000 threshold
* `ResultTabs/` (modular subfolder)
  * `TaxableToggleDialog` — confirmation dialog for App5/App13 manual override
  * `DevTab` — raw JSON inspector for input/output (dev aid)
* `Disclaimer`, `InfoModal`
* `presentation/` — output formatters (maps domain objects to display-ready values):
  * `TradePresenter`, `HoldingPresenter`, `DividendPresenter`, `InterestPresenter`
  * `TradeSummaryPresenter`, `ExcelPresenter`
  * `fmt.js` — locale number formatting

No business logic. No direct browser API imports (except `presentation/` which is React-free).

Tax-toggle behavior note:

* Trade classification starts from `TradeCalculator` + `classifier.js`.
* User overrides happen in COMPONENTS/controller state (per-trade `taxable` flag).
* Overrides do **not** recalculate cost basis; they recalculate only reporting
  aggregates through `core/services/tradeSummary.js`:
  * `calculateTotals(...).totals` for table totals
  * `calculateTotals(...).taxSummary.sumTaxable` for App5
  * `calculateTotals(...).taxSummary.sumExempt` for App13

---

### Dependency direction

```
app/components/ResultTabs → app/components/presentation
app/App.jsx       → app/hooks
                       ├── app/input/fileReader
                       │     └── app/input/{csvParser,htmlParser}
                       └── core/services/{parseInput,calculateTax}
                              ├── core/parser
                              └── core/domain
```

---

## 6) Theming

Themes defined in `src/app/theme.js`:

* `dayTheme`
* `nightTheme`

Applied via `useThemeMode` hook → `app/hooks/themeStorage.js`:

```js
document.documentElement.setAttribute('data-theme', 'night' | 'day')
```

`styles/index.css` uses `[data-theme]` for non-MUI styling (layout shell only).

---

### Info-box pattern

Always use `alpha()`:

```jsx
bgcolor: (theme) =>
  theme.palette.mode === 'dark'
    ? alpha(theme.palette.warning.main, 0.10)
    : '#FFFBEB'
```

Do not hardcode colors.

---

## 7) i18n rules

* All strings → `src/app/localization/bg.json`
* Use `import { t } from '../localization/i18n.js'` (relative to each file's location within `app/`)
* `t` is a plain function (not a React hook) — safe to call anywhere
* Use `t('key', { returnObjects: true })` for structured content
* Use interpolation: `t('key', { varName: value })` → `{{ varName }}` in JSON
* Dropzone info uses `infoKey="csv" | "htm"`

---

## 8) React 19 guidelines

### State & data

* Keep state minimal and local
* No derived state
* Prefer `useReducer` for grouped updates

### Effects

* Only for external sync
* Never for data transformation

### Async

* Prefer `useActionState`
* Use transitions for non-urgent updates

### Memoisation

* Do not pre-optimise
* Let React Compiler handle it

---

## 9) Performance

* Profile first
* Virtualise large lists
* Lazy-load heavy UI
* Avoid large eager JSON imports

---

## 10) MUI v9 rules

* Use `sx` by default
* Use theme callbacks `(theme) => ...`
* Centralise overrides in theme
* Use `alpha()` for transparency
* Avoid generic use of `grey.*`

---

## 11) File organisation

* One component per file
* No barrel files
* Clear separation:

```
src/
  core/          ← pure pipeline (server-exportable, no browser APIs, no React)
    services/    ← use-case orchestration (calculateTax, parseInput)
    parser/      ← input normalization + inference
    domain/      ← business logic (tax calculators, FX)
      tax/costBasis/  ← cost-basis strategies (weighted-average, IBKR)
  app/           ← everything React and browser-specific
    App.jsx      ← composition shell
    theme.js     ← MUI day/night themes
    hooks/       ← page-level hooks (workflow state + commands, useThemeMode)
    input/       ← file I/O + input assembly (browser adapters, CSV/HTML reading, validation)
    components/          ← React components (passive)
      presentation/ ← output formatters (translate codes → display strings)
    localization/ ← Bulgarian strings (bg.json + i18n.js)
  styles/        ← global CSS (index.css)
  assets/        ← static assets
  main.jsx       ← entry point
```

---

## 12) Code style

* Comments explain **why**
* Default export for components
* Named exports for logic
* Use `Decimal.js` for all financial math

---

## 13) Testing

### Framework

* Vitest only

### Scope

Test only:

* parsers
* tax logic
* pure application functions (e.g. `parseInput`)

Do NOT test:

* UI
* hooks
* styling

### Structure

* `*.test.js`
* colocated or `__tests__/`

### Requirements

* deterministic
* no network
* real assertions

---

## 14) Git workflow

### Branching

* branch from `master`
* never commit directly to `master`

### Naming

* `feature/...`
* `fix/...`
* `refactor/...`

### PR rules

* include tests for logic changes
* pass `npm test`
* reference issue

---
