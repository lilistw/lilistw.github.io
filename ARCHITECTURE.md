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
    services/     Use-case orchestration
    domain/       Business logic (tax, FX, parsers)
      tax/
        costBasis/  Cost-basis strategies
    input/        Input boundary (format detection, validation, assembly)
  presentation/   Output formatters — domain objects to display-ready values
  readers/        Format readers (no browser APIs, no domain logic)
  platform/web/   Browser adapters (File, DOMParser, localStorage, PDF)
  controllers/    Page-level React hooks (workflow state + commands)
  ui/             React components (passive — render props, emit events)
  localization/   Bulgarian strings (bg.json + i18n.js)
```

### Dependency direction

```
ui -> controllers -> core/services -> core/domain
           |               |
      platform/web     core/input <- readers/
                            |
                        core/domain
```

`core/` has no imports from `ui/`, `controllers/`, `platform/`, or
`presentation/`. This keeps the pipeline portable and testable without a
browser.

---

## Data Flow

```
User drops CSV + HTML files
        |
        v
platform/web/fileReader.js
  readInputFromFiles({ csvFile, htmlFile })
        |
        v
core/services/parseInput.js
  parseInput({ csvText, htmlDoc })
        |
        +-> core/input/parseInput.js
        |       parseActivityStatementCsv(csvText)   -- CSV rows
        |       parseTradeConfirmationHtml(htmlDoc)  -- Trade[]
        |       buildInputData(csvRows, trades)       -- InputData
        |
        v
controllers/useTaxAppController.js
  inferPriorPositions(inputData)  -- detect positions opened before tax year
        |
        v
ui/PriorYearPositionsForm  -- user edits inferred cost basis values
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
presentation/ (TradePresenter, DividendPresenter, ...)
        |
        v
ui/ResultTabs/ (TradesTab, HoldingsTab, DividendsTab, InterestTab)
```

---

## Core Layer Details

### `core/services/`

Thin use-case orchestrators. No business logic.

- `parseInput.js` — delegates to `core/input/` and returns `InputData`
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

### `core/input/`

Input boundary: validates raw content and assembles `InputData`.

- `parseActivityStatementCsv(csvText)` — validates then returns CSV rows
- `parseTradeConfirmationHtml(doc)` — validates then returns `Trade[]`
- `buildInputData(csvRows, trades)` — assembles the canonical `InputData` object

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

`readCsv.js` (PapaParse wrapper) lives in `readers/` rather than `core/`
because it wraps a third-party library, but has no browser globals.
`readPdf.js` is in `platform/web/` because `pdfjs-dist` requires browser
globals.

### Decimal.js for all financial arithmetic

JavaScript `number` cannot represent monetary values exactly. All amounts that
enter the domain are immediately wrapped in `Decimal`; they are only converted
back to `number` at the presentation boundary.

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

Two themes defined in `src/theme.js` (`dayTheme`, `nightTheme`).
`useThemeMode` hook persists the choice via `platform/web/themeStorage.js`,
which writes `data-theme="day|night"` on `document.documentElement`.
MUI theme is applied via `ThemeProvider`; `index.css` uses `[data-theme]`
selectors only for the non-MUI layout shell.

Always use `alpha()` for semi-transparent backgrounds; never hardcode hex
colors in component `sx` props.

---

## Testing

Vitest only. Tests cover parsers, tax calculators, and pure application
functions (`parseInput`, `calculateTax`). UI, controllers, and styling are not
tested.

Test files are colocated with their modules or placed in adjacent `__tests__/`
directories.
