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
* **App8 Holdings** — all foreign positions at 31 Dec.
* **App8 Dividends** — 5% tax with withholding credit.

---

## 4) Runtime flow

`src/controllers/useTaxAppController.js` owns page state and orchestration.
`src/App.jsx` is a thin composition shell.

```
User selects CSV + HTML
        ↓
useTaxAppController → readInputFromFiles() → parseInput() → inputData
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

### Controller layer (`src/controllers/`)

Page-level state and commands. One hook per page workflow.

* `useTaxAppController` — the main app workflow hook

No business logic. No direct browser API calls.

---

### Core layer (`src/core/`)

Pure pipeline — no browser APIs, no React. Safe to run on a server.

**`src/core/services/`** — use-case orchestration:

* `parseInput({ csvText, htmlDoc, csvPdfPages, tradePdfPages })` — pure InputData assembly
* `inferPriorPositions`
* `calculateTax`

**`src/core/domain/`** — business logic:

* parsers (`parser/`) — accept strings or pre-parsed DOM objects
* tax calculators (`tax/`) — `TradeCalculator`, `DividendCalculator`, `HoldingsCalculator`, `InterestCalculator`
* cost-basis strategies (`tax/costBasis/`) — `WeightedAverageCostBasisStrategy` (BG-law default), `IbkrCostBasisStrategy` (uses CSV value, falls back to weighted-average); `createCostBasisStrategy(name)` factory
* FX utilities (`fx/`)

**`src/core/input/`** — input boundary: format detection, validation, InputData assembly:

* `parseActivityStatementCsv(csvText)`
* `parseActivityStatementPdf(pages)`
* `parseTradeConfirmationHtml(doc)` — accepts pre-parsed Document
* `parseTradeConfirmationPdf(pages)`
* `buildInputData(csvRows, trades)`

No React imports. No browser globals. No localization calls (`t` is forbidden inside `src/core/`).

---

### Presentation layer (`src/presentation/`)

Output formatters — maps domain result objects to display-ready values. Translates currency codes and country codes to display strings at this boundary.

* `TradePresenter`, `HoldingPresenter`, `DividendPresenter`, `InterestPresenter`
* `TradeSummaryPresenter`, `ExcelPresenter`
* `fmt.js` — locale number formatting

No React imports. No business logic.

---

### Readers layer (`src/readers/`)

Format-specific text readers — no browser APIs, no domain logic.

* `readCsv.js` — wraps PapaParse; accepts CSV text, returns `string[][]`

`readPdf.js` stays in `src/platform/web/` because it requires browser globals.

---

### Platform layer (`src/platform/web/`)

Browser-specific adapters. The only place that may use browser globals.

* `fileReader.js` — reads File objects, calls `parseInput`
* `htmlParser.js` — wraps `DOMParser`
* `themeStorage.js` — wraps `localStorage` + `document.documentElement`
* `readPdf.js` — reads PDF files via `pdfjs-dist`

---

### Controller layer (`src/controllers/`)

Page-level state and commands. One hook per page workflow.

* `useTaxAppController` — the main app workflow hook
* `useThemeMode` — day/night toggle with persistence

No business logic. No direct browser API calls.

---

### UI layer (`src/ui/`)

All React components. Passive — render props only, emit events.

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

No business logic. No direct browser API imports.

---

### Dependency direction

```
ui → controllers → core/services → core/domain
           ↓              ↓
       platform/web    core/input ← readers/
                          ↓
                       core/domain
```

---

## 6) Theming

Themes defined in `src/theme.js`:

* `dayTheme`
* `nightTheme`

Applied via `useThemeMode` hook → `platform/web/themeStorage.js`:

```js
document.documentElement.setAttribute('data-theme', 'night' | 'day')
```

`index.css` uses `[data-theme]` for non-MUI styling (layout shell only).

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

* All strings → `src/localization/bg.json`
* Use `import { t } from '../localization/i18n.js'`
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
    services/    ← use-case orchestration (calculateTax, parseInput, …)
    domain/      ← business logic (tax calculators, FX, parsers)
      tax/costBasis/  ← cost-basis strategies (weighted-average, IBKR)
    input/       ← input boundary (format detection, validation, InputData assembly)
  presentation/  ← output formatters (translate codes → display strings)
  readers/       ← format readers (no browser APIs, no domain logic)
  platform/
    web/         ← browser adapters (DOMParser, File, localStorage, PDF reading)
  controllers/   ← page-level hooks (workflow state + commands, useThemeMode)
  ui/            ← React components (passive)
  localization/  ← Bulgarian strings (bg.json + i18n.js)
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
* controllers/hooks
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
