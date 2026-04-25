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

### Application layer (`src/application/`)

Pure orchestration / service logic. No File or browser APIs.

* `parseInput({ csvText, htmlDoc, csvPdfPages, tradePdfPages })` — pure InputData assembly
* `inferPriorPositions`
* `calculateTax`

No React imports. No browser globals.

---

### Domain layer (`src/domain/`)

Pure business logic:

* parsers (`parser/`) — accept strings or pre-parsed DOM objects
* tax calculators (`tax/`)
* FX utilities (`fx/`)

Examples:

* `TradeCalculator`
* `DividendCalculator`
* `HoldingsCalculator`

No React imports. No browser APIs.

---

### Parsing layer (`src/parsing/`)

Low-level parser functions. Pure — accepts already-read text or pages.

* `parseActivityStatementCsv(csvText)`
* `parseActivityStatementPdf(pages)`
* `parseTradeConfirmationHtml(doc)` — accepts pre-parsed Document
* `parseTradeConfirmationPdf(pages)`
* `buildInputData(csvRows, trades)`

---

### Presentation layer (`src/presentation/`)

Output formatters — maps domain result objects to display-ready values.

* `TradePresenter`, `HoldingPresenter`, `DividendPresenter`, `InterestPresenter`
* `TradeSummaryPresenter`, `ExcelPresenter`
* `fmt.js` — locale number formatting

No React imports. No business logic.

---

### Platform layer (`src/platform/web/`)

Browser-specific adapters. The only place that may use browser globals.

* `fileReader.js` — reads File objects, calls `parseInput`
* `htmlParser.js` — wraps `DOMParser`
* `themeStorage.js` — wraps `localStorage` + `document.documentElement`

---

### Hooks layer (`src/hooks/`)

Reusable React hooks that compose platform adapters.

* `useThemeMode` — day/night toggle with persistence

---

### UI layer (`src/ui/`)

All React components. Passive — render props only, emit events.

* `AppHeader`, `AppFooter`
* `Dropzone`
* `PriorYearPositionsForm`
* `ResultTabs/` (modular subfolder)
* `Disclaimer`, `InfoModal`

No business logic. No direct browser API imports.

---

### Dependency direction

```
ui → controllers → application → domain
           ↓
       platform/web    (injected at edges, never imported by domain)
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
* Use `import { t } from '../localization/translate.js'`
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
  application/   ← pure orchestration (no browser APIs)
  domain/        ← pure logic (no browser APIs)
  parsing/       ← pure text parsers (no browser APIs)
  presentation/  ← output formatters
  io/            ← PDF reading (File.arrayBuffer)
  platform/
    web/         ← browser adapters (DOMParser, File, localStorage)
  controllers/   ← page-level hooks (workflow state + commands)
  hooks/         ← reusable React hooks
  ui/            ← React components (passive)
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
