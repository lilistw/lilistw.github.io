// @vitest-environment jsdom
/**
 * Integration test: CSV + HTML parsing pipeline produces valid InputData.
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect } from 'vitest'
import { parseActivityStatementCsv, parseTradeConfirmationHtml, buildInputData } from '../buildInputData.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DEMO_DIR = resolve(import.meta.dirname, '../../../../public/demo')

function loadDemoCsv() {
  return readFileSync(resolve(DEMO_DIR, 'U0_2025_activity_demo.csv'), 'utf-8')
}

function loadDemoHtmlDoc() {
  const html = readFileSync(resolve(DEMO_DIR, 'U0_2025_trades_demo.htm'), 'utf-8')
  return new DOMParser().parseFromString(html, 'text/html')
}

// ---------------------------------------------------------------------------
// CSV + HTML path — parsers must produce valid InputData
// ---------------------------------------------------------------------------

describe('CSV + HTML path produces valid InputData', () => {
  it('parseActivityStatementCsv returns rows with Statement marker', () => {
    const rows = parseActivityStatementCsv(loadDemoCsv())
    expect(rows.some(r => r[0] === 'Statement' && r[1] === 'Data')).toBe(true)
  })

  it('parseTradeConfirmationHtml returns trade objects with required fields', () => {
    const trades = parseTradeConfirmationHtml(loadDemoHtmlDoc())
    expect(trades.length).toBeGreaterThan(0)
    const t = trades[0]
    expect(t).toHaveProperty('symbol')
    expect(t).toHaveProperty('currency')
    expect(t).toHaveProperty('side')
    expect(t).toHaveProperty('quantity')
    expect(t).toHaveProperty('price')
  })

  it('buildInputData from CSV produces all required InputData fields', () => {
    const csvRows = parseActivityStatementCsv(loadDemoCsv())
    const trades = parseTradeConfirmationHtml(loadDemoHtmlDoc())
    const data = buildInputData(csvRows, trades)

    expect(data.statement).toBeDefined()
    expect(data.statement.brokerName).toMatch(/Interactive Brokers/)
    expect(data.account).toBeDefined()
    expect(data.account.accountId).toBeTruthy()
    expect(typeof data.taxYear).toBe('number')
    expect(Array.isArray(data.instruments)).toBe(true)
    expect(data.instruments.length).toBeGreaterThan(0)
    expect(Array.isArray(data.dividends)).toBe(true)
    expect(Array.isArray(data.withholdingTax)).toBe(true)
    expect(Array.isArray(data.trades)).toBe(true)
    expect(Array.isArray(data.openPositions)).toBe(true)
    expect(Array.isArray(data.csvTrades)).toBe(true)
    expect(data.csvTrades.length).toBeGreaterThan(0)
    expect(Array.isArray(data.interest)).toBe(true)
  })

  it('csvTrades have required fields', () => {
    const csvRows = parseActivityStatementCsv(loadDemoCsv())
    const data = buildInputData(csvRows, [])
    const t = data.csvTrades[0]
    expect(t).toHaveProperty('symbol')
    expect(t).toHaveProperty('currency')
    expect(t).toHaveProperty('side')
    expect(t).toHaveProperty('quantity')
    expect(t).toHaveProperty('datetime')
  })

  it('openPositions have required fields', () => {
    const csvRows = parseActivityStatementCsv(loadDemoCsv())
    const data = buildInputData(csvRows, [])
    expect(data.openPositions.length).toBeGreaterThan(0)
    const p = data.openPositions[0]
    expect(p).toHaveProperty('symbol')
    expect(p).toHaveProperty('currency')
    expect(p).toHaveProperty('assetCategory')
    expect(p).toHaveProperty('quantity')
  })
})
