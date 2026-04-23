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
| i18n              | i18next + react-i18next                     |
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

`src/App.jsx` is the orchestration layer.

```
User selects CSV + HTML
        ↓
readInput() → parse → inputData
        ↓
inferPriorPositions() → pendingPositions
        ↓
PriorYearPositionsForm (user edits)
        ↓
calculateTax(inputData, priorPositions)
        ↓
ResultTabs (trades / holdings / dividends / interest)
```

`App.jsx` also owns:

* theme switching
* file lifecycle (Object URLs)
* demo loading
* terms acceptance
* error handling

---

## 5) Architecture layers

### Application layer (`src/application/`)

Pure orchestration / service logic:

* `readInput`
* `inferPriorPositions`
* `calculateTax`

No React imports.

---

### Domain layer (`src/domain/`)

Pure business logic:

* parsers (`parser/`)
* tax calculators (`tax/`)
* FX utilities (`fx/`)

Examples:

* `TradeCalculator`
* `DividendCalculator`
* `HoldingsCalculator`

No React imports.

---

### UI layer (`src/ui/`)

All React components:

* `AppHeader`, `AppFooter`
* `Dropzone`
* `PriorYearPositionsForm`
* `ResultTabs/` (modular subfolder)
* `Disclaimer`, `TermsModal`

No business logic.

---

## 6) Theming

Themes defined in `src/theme.js`:

* `dayTheme`
* `nightTheme`

Applied in `App.jsx`:

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

* All strings → `src/i18n/locales/bg.json`
* Use `t('key')`
* Use `returnObjects: true` for structured content
* Use `<Trans>` only when needed
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
  application/   ← orchestration
  domain/        ← pure logic
  ui/            ← React components
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

Do NOT test:

* UI
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
