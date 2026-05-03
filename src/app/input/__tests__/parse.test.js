// @vitest-environment jsdom
/**
 * Integration test: CSV + HTML parsing pipeline produces valid InputData.
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect } from 'vitest'
import { parseActivityStatementCsv } from '../csvParser.js'
import { parseTradesFromHtml } from '../htmlParser.js'

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
  it('parseCsv returns rows with Statement marker', () => {
    const rows = parseActivityStatementCsv(loadDemoCsv())
    expect(rows.some(r => r[0] === 'Statement' && r[1] === 'Data')).toBe(true)
  })

  it('parseTradeConfirmationHtml returns trade objects with required fields', () => {
    const trades = parseTradesFromHtml(loadDemoHtmlDoc().documentElement.outerHTML)
    expect(trades.length).toBeGreaterThan(0)
    const t = trades[0]
    expect(t).toHaveProperty('symbol')
    expect(t).toHaveProperty('currency')
    expect(t).toHaveProperty('side')
    expect(t).toHaveProperty('quantity')
    expect(t).toHaveProperty('price')
  })
})
