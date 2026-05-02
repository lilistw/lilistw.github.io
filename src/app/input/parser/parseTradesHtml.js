import { parseToDecimal } from '@util/numStr.js'

/**
 * Parses an IBKR Trade Confirmation Report HTML document into a raw array.
 *
 * Shows only sub-rows (row-detail tbody) which carry the actual execution exchange.
 * Skips Forex trades.
 *
 * Cell layout per detail <tr>:
 *   0: Acct ID | 1: Symbol (colspan=2) | 2: Trade Date/Time | 3: Settle Date |
 *   4: Exchange | 5: Type (side) | 6: Quantity | 7: Price | 8: Proceeds |
 *   9: Comm (commission) | 10: Fee | 11: Order Type | 12: Code
 *
 * Numeric fields are returned as Decimal instances (null for blank/non-numeric).
 *
 * @param {Document} doc - pre-parsed HTML document
 * @returns {object[]}
 */
export function parseTradesFromHtml(doc) {
  const rows = []
  let currency = null
  let asset = null
  let skipSection = false

  for (const tbody of doc.querySelectorAll('tbody')) {
    const assetHeader = tbody.querySelector('td.header-asset')
    if (assetHeader) {
      const cat = assetHeader.textContent.trim()
      skipSection = /^(forex|fx)$/i.test(cat)
      asset = skipSection ? null : cat
      continue
    }

    if (skipSection) continue

    const currHeader = tbody.querySelector('td.header-currency')
    if (currHeader) {
      currency = currHeader.textContent.trim()
      continue
    }

    if (!tbody.classList.contains('row-detail')) continue

    for (const tr of tbody.querySelectorAll('tr')) {
      const cells = Array.from(tr.querySelectorAll('td'))
      if (cells.length < 13) continue

      const txt = (c) => c.textContent.trim()
      const exchange = txt(cells[4])
      if (!exchange || exchange === '-') continue

      rows.push({
        asset:      asset    ?? '',
        currency:   currency ?? '',
        symbol:     txt(cells[1]),
        datetime:   txt(cells[2]),
        settleDate: txt(cells[3]),
        exchange,
        side:       txt(cells[5]),
        quantity:   parseToDecimal(txt(cells[6])),
        price:      parseToDecimal(txt(cells[7])),
        proceeds:   parseToDecimal(txt(cells[8])),
        commission: parseToDecimal(txt(cells[9])),
        fee:        parseToDecimal(txt(cells[10])),
        orderType:  txt(cells[11]),
        code:       txt(cells[12]),
      })
    }
  }

  return rows
}
