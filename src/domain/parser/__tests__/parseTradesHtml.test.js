// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { parseTradesFromHtml } from '../parseTradesHtml.js'

// All tbodies must live inside a <table> or the HTML parser hoists them out.
function buildHtml(tableContent) {
  return `<!DOCTYPE html><html><body>
<table><tbody></tbody></table>
<table id="summaryDetailTable">${tableContent}</table>
</body></html>`
}

// Builds a minimal Stocks/USD section with any number of trade tbodies.
function stocksSection(currency, tradeTbodies) {
  return `
<tbody><tr><td class="header-asset">Stocks</td></tr></tbody>
<tbody><tr><td class="header-currency">${currency}</td></tr></tbody>
${tradeTbodies}
`
}

function summaryTbody(fields) {
  return `
<tbody>
<tr class="row-summary">
<td>${fields.acct ?? 'U00000001'}</td>
<td colspan="2">${fields.symbol ?? 'AAPL'}</td>
<td>${fields.datetime ?? '2025-10-08, 14:30:00'}</td>
<td>${fields.settle ?? '2025-10-10'}</td>
<td>-</td>
<td>${fields.side ?? 'BUY'}</td>
<td align="right">${fields.qty ?? '10'}</td>
<td align="right">${fields.price ?? '174.5000'}</td>
<td align="right">${fields.proceeds ?? '-1,745.00'}</td>
<td align="right">${fields.comm ?? '-2.50'}</td>
<td align="right">${fields.fee ?? '0.00'}</td>
<td align="right">${fields.orderType ?? 'LMT'}</td>
<td align="right">${fields.code ?? 'O'}</td>
</tr>
</tbody>`
}

function detailTbody(fields) {
  return `
<tbody class="row-detail">
<tr>
<td class="indent">${fields.acct ?? 'U00000001'}</td>
<td colspan="2">${fields.symbol ?? 'AAPL'}</td>
<td>${fields.datetime ?? '2025-10-08, 14:30:00'}</td>
<td>${fields.settle ?? '2025-10-10'}</td>
<td>${fields.exchange ?? 'NASDAQ'}</td>
<td>${fields.side ?? 'BUY'}</td>
<td align="right">${fields.qty ?? '10'}</td>
<td align="right">${fields.price ?? '174.5000'}</td>
<td align="right">${fields.proceeds ?? '-1,745.00'}</td>
<td align="right">${fields.comm ?? '-2.50'}</td>
<td align="right">${fields.fee ?? '0.00'}</td>
<td align="right">${fields.orderType ?? 'LMT'}</td>
<td align="right">${fields.code ?? 'O'}</td>
</tr>
</tbody>`
}

function trade(fields) {
  return summaryTbody(fields) + detailTbody(fields)
}

describe('parseTradesFromHtml', () => {
  it('returns empty array for empty document', () => {
    expect(parseTradesFromHtml(buildHtml(''))).toEqual([])
  })

  it('returns empty array when only summary tbodies exist (no row-detail)', () => {
    const html = buildHtml(stocksSection('USD', summaryTbody({})))
    expect(parseTradesFromHtml(html)).toEqual([])
  })

  it('parses a single BUY trade from a detail tbody', () => {
    const html = buildHtml(stocksSection('USD', trade({})))
    const result = parseTradesFromHtml(html)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      asset:      'Stocks',
      currency:   'USD',
      symbol:     'AAPL',
      datetime:   '2025-10-08, 14:30:00',
      settleDate: '2025-10-10',
      exchange:   'NASDAQ',
      side:       'BUY',
      quantity:   '10',
      price:      '174.5000',
      proceeds:   '-1,745.00',
      commission: '-2.50',
      fee:        '0.00',
      orderType:  'LMT',
      code:       'O',
    })
  })

  it('parses a SELL trade correctly', () => {
    const html = buildHtml(stocksSection('USD', trade({
      symbol: 'AAPL', side: 'SELL', qty: '-5',
      price: '180.0000', proceeds: '900.00', code: 'C',
    })))
    const result = parseTradesFromHtml(html)
    expect(result).toHaveLength(1)
    expect(result[0].side).toBe('SELL')
    expect(result[0].quantity).toBe('-5')
    expect(result[0].proceeds).toBe('900.00')
    expect(result[0].code).toBe('C')
  })

  it('skips detail rows where exchange is "-" (summary row leaked)', () => {
    // A detail tbody whose exchange cell is '-' should be ignored
    const leakyDetail = `
<tbody class="row-detail">
<tr>
<td>U00000001</td><td colspan="2">AAPL</td><td>2025-10-08, 14:30:00</td>
<td>2025-10-10</td><td>-</td><td>BUY</td><td>10</td>
<td>174.5</td><td>-1745</td><td>-2.5</td><td>0</td><td>LMT</td><td>O</td>
</tr>
</tbody>`
    const html = buildHtml(stocksSection('USD', leakyDetail))
    expect(parseTradesFromHtml(html)).toEqual([])
  })

  it('skips detail rows with fewer than 13 cells', () => {
    const shortRow = `
<tbody class="row-detail">
<tr><td>U1</td><td>AAPL</td><td>2025-01-01</td></tr>
</tbody>`
    const html = buildHtml(stocksSection('USD', shortRow))
    expect(parseTradesFromHtml(html)).toEqual([])
  })

  it('skips entire Forex section', () => {
    const html = buildHtml(`
<tbody><tr><td class="header-asset">Forex</td></tr></tbody>
<tbody><tr><td class="header-currency">USD</td></tr></tbody>
${trade({ symbol: 'EUR.USD', side: 'BUY' })}`)
    expect(parseTradesFromHtml(html)).toEqual([])
  })

  it('skips FX section (alternate asset header text)', () => {
    const html = buildHtml(`
<tbody><tr><td class="header-asset">FX</td></tr></tbody>
<tbody><tr><td class="header-currency">USD</td></tr></tbody>
${trade({ symbol: 'EUR.USD' })}`)
    expect(parseTradesFromHtml(html)).toEqual([])
  })

  it('parses multiple trades under the same currency', () => {
    const html = buildHtml(stocksSection('USD',
      trade({ symbol: 'AAPL', side: 'BUY', qty: '10' }) +
      trade({ symbol: 'AAPL', side: 'SELL', qty: '-5', code: 'C' }) +
      trade({ symbol: 'GOOG', side: 'BUY', qty: '2' })
    ))
    const result = parseTradesFromHtml(html)
    expect(result).toHaveLength(3)
    expect(result.map(r => r.symbol)).toEqual(['AAPL', 'AAPL', 'GOOG'])
  })

  it('inherits currency across trades within a section', () => {
    const html = buildHtml(stocksSection('EUR',
      trade({ symbol: 'VWCE' }) +
      trade({ symbol: 'IWDA' })
    ))
    const result = parseTradesFromHtml(html)
    expect(result).toHaveLength(2)
    expect(result.every(r => r.currency === 'EUR')).toBe(true)
  })

  it('switches currency when a new header-currency tbody appears', () => {
    const html = buildHtml(`
<tbody><tr><td class="header-asset">Stocks</td></tr></tbody>
<tbody><tr><td class="header-currency">USD</td></tr></tbody>
${trade({ symbol: 'AAPL' })}
<tbody><tr><td class="header-currency">EUR</td></tr></tbody>
${trade({ symbol: 'VWCE' })}`)
    const result = parseTradesFromHtml(html)
    expect(result).toHaveLength(2)
    expect(result[0].currency).toBe('USD')
    expect(result[1].currency).toBe('EUR')
  })

  it('resumes parsing Stocks trades after a Forex section', () => {
    const html = buildHtml(`
<tbody><tr><td class="header-asset">Stocks</td></tr></tbody>
<tbody><tr><td class="header-currency">USD</td></tr></tbody>
${trade({ symbol: 'AAPL' })}
<tbody><tr><td class="header-asset">Forex</td></tr></tbody>
${trade({ symbol: 'EUR.USD' })}
<tbody><tr><td class="header-asset">Stocks</td></tr></tbody>
<tbody><tr><td class="header-currency">EUR</td></tr></tbody>
${trade({ symbol: 'VWCE' })}`)
    const result = parseTradesFromHtml(html)
    expect(result).toHaveLength(2)
    expect(result.map(r => r.symbol)).toEqual(['AAPL', 'VWCE'])
  })

  it('handles subtotal tbodies without crashing', () => {
    const subtotal = `<tbody><tr class="subtotal">
<td colspan="7">Total AAPL (Bought)</td>
<td>10</td><td>174.5</td><td>-1745</td><td>-2.5</td><td>0</td><td>&nbsp;</td><td>&nbsp;</td>
</tr></tbody>`
    const html = buildHtml(stocksSection('USD', trade({}) + subtotal))
    expect(parseTradesFromHtml(html)).toHaveLength(1)
  })

  it('returns asset field from the current Stocks header', () => {
    const html = buildHtml(stocksSection('USD', trade({})))
    const result = parseTradesFromHtml(html)
    expect(result[0].asset).toBe('Stocks')
  })
})
