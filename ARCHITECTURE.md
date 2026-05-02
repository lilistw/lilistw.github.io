# Architecture

## Purpose

IBKR Tax Calculator is a client-side React SPA that parses Interactive Brokers
account exports and produces Bulgarian annual tax declaration figures.
No data leaves the browser.

---

## Layer Structure

```
src/
  core/           Pure pipeline — no browser APIs, no React
    services/     Use-case orchestration (calculateTax, inferPriorPositions)
    domain/       Business logic (tax, FX, parsers)
      tax/
        costBasis/  Cost-basis strategies
  app/            Everything React and browser-specific
    App.jsx       Composition shell
    theme.js      MUI day/night themes
    hooks/        Page-level React hooks (workflow state + commands)
    input/        File I/O + input assembly (browser adapters, CSV/HTML, validation)
    ui/           React components (passive — render props, emit events)
      presentation/ Output formatters — domain objects to display-ready values
    localization/ Bulgarian strings (bg.json + i18n.js)
  styles/         Global CSS (index.css)
  assets/         Static assets
  main.jsx        Entry point
```

### Dependency direction

```
app/ui/ResultTabs → app/ui/presentation ─────┐
app/App.jsx       → app/hooks                │
                       ├── core/services ─────┤→ core/domain
                       └── app/input ─────────┘
```

`core/` has no imports from `app/` or `styles/`. This keeps the pipeline
portable and testable without a browser.

---

## Data Flow

```
User drops CSV + HTML files
        |
        v
app/input/fileReader.js
  readInputFromFiles({ csvFile, htmlFile })
        |
        v
app/input/parseInput.js
  parseInput({ csvText, htmlDoc })
        |
        v
app/input/buildInputData.js
  parseActivityStatementCsv(csvText)   -- CSV rows
  parseTradeConfirmationHtml(htmlDoc)  -- Trade[]
  buildInputData(csvRows, trades)       -- InputData
        |
        v
app/hooks/useTaxAppController.js
  inferPriorPositions(inputData)  -- detect positions opened before tax year
        |
        v
app/ui/PriorYearPositionsForm  -- user edits inferred cost basis values
        |
        v
core/services/calculateTax.js
  calculateTax(inputData, priorPositions, { strategy })
        |
        +-> TradeCalculator    -- realized gains, cost basis, App5/App13 split
        +-> HoldingsCalculator -- open positions at 31 Dec (App8)
        +-> DividendCalculator -- 5% tax + withholding credit (App8)
        +-> InterestCalculator -- aggregated interest income
        |
        v
app/ui/presentation/ (TradePresenter, DividendPresenter, ...)
        |
        v
app/ui/ResultTabs/ (TradesTab, HoldingsTab, DividendsTab, InterestTab)
```

---

## Layer Details

### `app/input/`

The only layer that may use browser globals or read files. It converts raw
browser inputs into plain data and hands off to `core/`.

- `fileReader.js` — reads `File` objects, delegates to `parseInput`
- `htmlParser.js` — wraps `DOMParser`
- `readCsv.js` — wraps PapaParse; returns `string[][]`
- `parseInput.js` — thin entry-point: `parseInput({ csvText, htmlDoc })` → `InputData`
- `buildInputData.js` — orchestrates domain parsers, returns canonical `InputData`
- `validateInput.js` — validates IBKR file content before parsing
- `themeStorage.js` — browser storage adapter for theme persistence (wraps
  `localStorage` + `document.documentElement`; used only by `app/hooks/useThemeMode`)

### `core/services/`

Thin use-case orchestrators. No business logic.

- `calculateTax.js` — builds `TaxContext`, wires domain calculators, returns result
- `inferPriorPositions.js` — detects sells with no matching buys in the statement

### `core/domain/parser/`

Parse specific CSV sections or HTML into plain objects.
Inputs are raw strings or pre-parsed DOM nodes; outputs are typed arrays.

Parsers: `parseStatementInfo`, `parseTaxYear`, `parseInstruments`,
`parseCsvTrades`, `parseTradesHtml`, `parseDividends`, `parseOpenPositions`,
`parseInterest`.

### `core/domain/tax/`

Calculate tax figures from `InputData` and prior positions.

- `TradeCalculator` — iterates trades chronologically, maintains a running
  position map, applies cost-basis strategy per sell
- `DividendCalculator` — matches dividends to withholding tax lines
- `InterestCalculator` — sums interest rows, converts to local currency
- `HoldingsCalculator` — merges open-position data with calculated positions

### `core/domain/tax/costBasis/`

Strategy pattern for cost-basis calculation per sell trade.

- `WeightedAverageCostBasisStrategy` — `position.cost / position.qty * sellQty`;
  mandatory per Bulgarian tax law
- `IbkrCostBasisStrategy` — uses the cost basis supplied in the CSV; falls back
  to weighted-average when the CSV value is absent
- `createCostBasisStrategy(name)` — factory; defaults to `'ibkr'`

### `core/domain/fx/`

FX conversion utilities.

- `fxRates.js` — `toLocalCurrency(amount, currency, date, taxYear)`;
  EUR uses the fixed BGN peg (1.95583); USD uses BNB daily rate from JSON files
- `rates/2024.fx.json`, `2025.fx.json`, `2026.fx.json` — bundled BNB rate tables

### `app/ui/presentation/`

Output formatters — no React imports, no business logic. Maps `Decimal` domain
values to locale strings at the display boundary.

- `TradePresenter`, `DividendPresenter`, `HoldingPresenter`, `InterestPresenter`
- `TradeSummaryPresenter` — builds App5 (taxable) and App13 (exempt) summaries
- `ExcelPresenter` — builds TSV export
- `fmt.js` — `fmt(n, decimals)` — Bulgarian locale number formatting

---

## Key Design Decisions

### Currency reporting changes at tax year 2026

Tax year 2025 and earlier: report in BGN. Tax year 2026 onwards: report in EUR.
`getLocalCurrencyCode(taxYear)` in `fxRates.js` centralises this rule. All
calculators and presenters use it via `TaxContext`.

### Cost-basis strategy is user-selectable

Bulgarian law mandates weighted-average, but IBKR provides its own basis figure
which many users have verified against their broker records. The UI exposes a
radio selector (`CostBasisStrategySelector`); the choice is passed into
`calculateTax` as `{ strategy: 'ibkr' | 'weighted-average' }`.

### App5 / App13 split is user-overridable

`TradeCalculator` classifies gains by instrument type via `classifier.js`.
Users can override the classification per trade via `TaxableToggleDialog`, which
writes back to the result array held in the controller.

### `core/` has no browser dependencies

All browser globals are confined to `app/input/`. `core/domain/parser/` receives
pre-parsed DOM nodes (passed in from `app/input/htmlParser.js`) rather than
calling `DOMParser` itself. This keeps the entire `core/` tree runnable in Node.

### Decimal.js for all financial arithmetic

JavaScript `number` cannot represent monetary values exactly. All amounts that
enter the domain are immediately wrapped in `Decimal`; they are only converted
back to `number` at the `app/ui/presentation/` boundary.

---

## UI Layer

React components are passive: they receive props and emit callbacks.
Business logic does not live in components.

Top-level components:

- `AppHeader`, `AppFooter` — chrome
- `Dropzone` — file drop/select for CSV and HTML inputs
- `CostBasisStrategySelector` — radio group for cost-basis strategy choice
- `PriorYearPositionsForm` — editable table for prior-year position cost basis
- `PriorYearApproxWarning` — warning when prior-year cost is approximated
- `ThresholdWarning` — warns when holdings total exceeds SPB8 EUR 25 000 threshold
- `Disclaimer`, `InfoModal` — legal and informational overlays
- `AboutSection` — static about content

`ResultTabs/` subfolder:

- `ResultTabs` — tab container
- `TradesTab`, `DividendsTab`, `InterestTab`, `HoldingsTab` — one tab per
  declaration section
- `TaxSummary`, `TaxFormSection` — summary rows and form-field helpers
- `DataTable` — generic sortable table
- `CopyButton`, `ExcelCopyButton` — clipboard export
- `TaxableToggleDialog` — confirmation dialog for manual App5/App13 override
- `DevTab` — raw JSON inspector for parsed input and calculated output (dev aid)

---

## Theming

Two themes defined in `src/app/theme.js` (`dayTheme`, `nightTheme`).
`useThemeMode` hook persists the choice via `app/input/themeStorage.js`,
which writes `data-theme="day|night"` on `document.documentElement`.
MUI theme is applied via `ThemeProvider`; `styles/index.css` uses `[data-theme]`
selectors only for the non-MUI layout shell.

Always use `alpha()` for semi-transparent backgrounds; never hardcode hex
colors in component `sx` props.

---

## Testing

Vitest only. Tests cover parsers, tax calculators, and pure application
functions (`buildInputData`, `calculateTax`). UI, hooks, and styling are not
tested.

Test files are colocated with their modules or placed in adjacent `__tests__/`
directories.
