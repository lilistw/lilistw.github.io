// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { validateCsvContent, validateHtmlContent, validateTradeCurrencies } from '../validateInput.js'

describe('validateCsvContent', () => {
  it('accepts rows that contain an IBKR Statement Data marker', () => {
    const rows = [
      ['Statement', 'Data', 'BrokerName', 'Interactive Brokers'],
      ['Statement', 'Data', 'Period', 'January 1, 2025 - December 31, 2025'],
    ]
    expect(() => validateCsvContent(rows)).not.toThrow()
  })

  it('throws for empty row array', () => {
    expect(() => validateCsvContent([])).toThrow('IBKR')
  })

  it('throws for rows that look like a non-IBKR CSV', () => {
    const rows = [
      ['Date', 'Description', 'Amount'],
      ['2025-01-01', 'Some payment', '100'],
    ]
    expect(() => validateCsvContent(rows)).toThrow()
  })
})

describe('validateHtmlContent', () => {
  function makeDoc(html) {
    return new DOMParser().parseFromString(html, 'text/html')
  }

  it('accepts document with IBKR header-asset class', () => {
    const doc = makeDoc('<html><body><table><tbody><tr><td class="header-asset">Stocks</td></tr></tbody></table></body></html>')
    expect(() => validateHtmlContent(doc)).not.toThrow()
  })

  it('accepts document with IBKR header-currency class', () => {
    const doc = makeDoc('<html><body><table><tbody><tr><td class="header-currency">USD</td></tr></tbody></table></body></html>')
    expect(() => validateHtmlContent(doc)).not.toThrow()
  })

  it('accepts document with IBKR row-detail tbody', () => {
    const doc = makeDoc('<html><body><table><tbody class="row-detail"><tr><td>data</td></tr></tbody></table></body></html>')
    expect(() => validateHtmlContent(doc)).not.toThrow()
  })

  it('throws for a document with tables but no IBKR markers', () => {
    const doc = makeDoc('<html><body><table><tr><td>Hello</td></tr></table></body></html>')
    expect(() => validateHtmlContent(doc)).toThrow()
  })

  it('throws for a document with no tables at all', () => {
    const doc = makeDoc('<html><body><p>Not a trade confirmation</p></body></html>')
    expect(() => validateHtmlContent(doc)).toThrow()
  })
})

describe('validateTradeCurrencies', () => {
  it('accepts trades with USD currency', () => {
    const trades = [{ currency: 'USD', symbol: 'AAPL' }]
    expect(() => validateTradeCurrencies(trades)).not.toThrow()
  })

  it('accepts trades with EUR currency', () => {
    const trades = [{ currency: 'EUR', symbol: 'VWCE' }]
    expect(() => validateTradeCurrencies(trades)).not.toThrow()
  })

  it('accepts empty trade array', () => {
    expect(() => validateTradeCurrencies([])).not.toThrow()
  })

  it('accepts trades with empty currency string', () => {
    const trades = [{ currency: '', symbol: 'X' }]
    expect(() => validateTradeCurrencies(trades)).not.toThrow()
  })

  it('throws for trades with unsupported currency', () => {
    const trades = [{ currency: 'GBP', symbol: 'GSK' }]
    expect(() => validateTradeCurrencies(trades)).toThrow('GBP')
  })

  it('throws on the first unsupported currency found', () => {
    const trades = [
      { currency: 'USD', symbol: 'AAPL' },
      { currency: 'CHF', symbol: 'NESN' },
    ]
    expect(() => validateTradeCurrencies(trades)).toThrow('CHF')
  })
})
