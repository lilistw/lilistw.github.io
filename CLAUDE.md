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

`src/hooks/useTaxAppController.js` owns page state and orchestration.
`src/App.jsx` is a thin composition shell.

```
User selects CSV + HTML
        ↓
useTaxAppController → readInputFromFiles()
        ↓  (input/ layer: reads files, parses IBKR formats, assembles InputData)
inputData  ← instrumentInfo and csvTradeBasis pre-built here
        ↓
inferPriorPositions(inputData) → pendingPositions
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

### Hooks layer (`src/hooks/`)

Page-level state and commands. One hook per page workflow.

* `useTaxAppController` — the main app workflow hook
* `useThemeMode` — day/night toggle with persistence
* `themeStorage.js` — localStorage + DOM adapter for theme (used only by `useThemeMode`)

No business logic. No direct browser API calls beyond `themeStorage.js`.

---

### Core layer (`src/core/`)

Pure pipeline — no browser APIs, no React. Safe to run on a server.

Two public entry points (called with a fully-assembled `InputData`):

* `inferPriorPositions(inputData)` — infers prior-year open positions
* `calculateTax(inputData, priorPositions, options)` — computes full tax result

**`src/core/services/`** — use-case orchestration for the two entry points above.

**`src/core/domain/`** — business logic:

* tax calculators (`tax/`) — `TradeCalculator`, `DividendCalculator`, `HoldingsCalculator`
* FX utilities (`fx/`) — rates + conversion
* `aliases.js` — `expandByAliases`: expands symbol-keyed dicts to cover IBKR aliases
* `positions.js` — `buildOpenPositions`: enriches raw open-position rows with cost-basis overrides
* `classifier.js` — instrument classification and tax-exemption rules

No React imports. No browser globals. No localization calls (`t` is forbidden inside `src/core/`).
`InputData` arrives pre-assembled with `instrumentInfo` and `csvTradeBasis` already built — core reads them directly.

---

### Input layer (`src/input/`)

Full File→InputData pipeline. Contains all IBKR-specific parsing knowledge and all browser file-reading utilities.

* `readCsv.js` — CSV text → `string[][]` (wraps PapaParse, no browser APIs)
* `readPdf.js` — PDF bytes → `PdfPage[]` (uses pdfjs-dist, requires browser globals)
* `readHtml.js` — HTML string → `Document` (wraps DOMParser, requires browser globals)
* `fileReader.js` — browser entry point: reads `File` objects, delegates to format readers, then calls the parsers and `buildInputData`
* `parseInput.js` — pure parsing entry points:
  * `parseActivityStatementCsv(csvText)` / `parseActivityStatementPdf(pages)`
  * `parseTradeConfirmationHtml(doc)` / `parseTradeConfirmationPdf(pages)`
  * `buildInputData(csvRows, trades)` — assembles full InputData including `instrumentInfo` and `csvTradeBasis`
* Domain-specific parsers: `parseCsvTrades`, `parseDividends`, `parseInstruments`, `parseOpenPositions`, `parseStatementInfo`, `parseTradesHtml`, etc.
* `validateInput.js` — format detection and validation

---

### UI layer (`src/ui/`)

All React components. Passive — render props only, emit events.

* `AppHeader`, `AppFooter`, `Dropzone`, `PriorYearPositionsForm`, `Disclaimer`, `InfoModal`
* `ResultTabs`, `TradesTab`, `HoldingsTab`, `DividendsTab`, `InterestTab` — all flat in `ui/`
* `DataTable`, `TaxSummary`, `TaxFormSection`, `ExcelCopyButton`, `CopyButton`, `DevTab`

**`src/ui/presenters/`** — output formatters: map domain result objects to display-ready values. No React imports. No business logic.

* `TradePresenter`, `HoldingPresenter`, `DividendPresenter`, `InterestPresenter`
* `TradeSummaryPresenter`, `ExcelPresenter`
* `fmt.js` — locale number formatting

No business logic in components. No direct browser API imports.

---

### Dependency direction

```
ui → hooks → core/services → core/domain
       ↓
   input/ ──────────────────→ core/domain
   (reads files, parses IBKR formats, assembles InputData)
```

---

## 6) Theming

Themes defined in `src/theme.js`:

* `dayTheme`
* `nightTheme`

Applied via `useThemeMode` hook → `hooks/themeStorage.js`:

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
  core/          ← pure domain pipeline (no browser APIs, no React, server-safe)
    services/    ← 2 entry points: inferPriorPositions, calculateTax
    domain/      ← business logic (tax calculators, FX, aliases, positions, classifier)
  input/         ← full File→InputData pipeline (IBKR parsing + file reading)
  hooks/         ← page-level hooks (useTaxAppController, useThemeMode, themeStorage)
  ui/            ← React components (passive, flat)
    presenters/  ← output formatters (translate codes → display strings)
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
