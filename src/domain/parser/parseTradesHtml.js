/**
 * Parses an IBKR Trade Confirmation Report HTML file.
 *
 * Shows only sub-rows (row-detail tbody) which carry the actual execution exchange.
 * Skips Forex trades.
 *
 * Cell layout per detail <tr>:
 *   0: Acct ID | 1: Symbol (colspan=2) | 2: Trade Date/Time | 3: Settle Date |
 *   4: Exchange | 5: Type | 6: Quantity | 7: Price | 8: Proceeds |
 *   9: Comm | 10: Fee | 11: Order Type | 12: Code
 *
 * 
 * @param {string} htmlText
 * @returns {{ columns: object[], rows: object[] }}
 */
export function parseTradesFromHtml(htmlText) {
  const doc = new DOMParser().parseFromString(htmlText, 'text/html')
  const rows = []
  let currency = null
  let skipSection = false

  for (const tbody of doc.querySelectorAll('tbody')) {
    // Asset category header (Stocks / Forex)
    const assetHeader = tbody.querySelector('td.header-asset')
    if (assetHeader) {
      const cat = assetHeader.textContent.trim()
      skipSection = cat === 'Forex' || cat === 'FX'
      continue
    }

    if (skipSection) continue

    // Currency header
    const currHeader = tbody.querySelector('td.header-currency')
    if (currHeader) {
      currency = currHeader.textContent.trim()
      continue
    }

    // Only actual execution rows
    if (!tbody.classList.contains('row-detail')) continue

    for (const tr of tbody.querySelectorAll('tr')) {
      const cells = Array.from(tr.querySelectorAll('td'))
      if (cells.length < 13) continue

      const txt = (c) => c.textContent.trim()
      const num = (s) => {
        const n = parseFloat(s.replace(/,/g, ''))
        return isNaN(n) ? null : n
      }

      const exchange = txt(cells[4])
      if (!exchange || exchange === '-') continue

      rows.push({
        taxable:    true,
        symbol:     txt(cells[1]),
        dateTime:   txt(cells[2]),
        date:       txt(cells[2]).split(',')[0].trim(),
        settleDate: txt(cells[3]),
        exchange,
        currency,
        type:       txt(cells[5]),
        quantity:   Math.abs(num(txt(cells[6])) ?? 0),
        price:      num(txt(cells[7])),
        proceeds:   num(txt(cells[8])),
        comm:       num(txt(cells[9])),
        fee:        num(txt(cells[10])),
        orderType:  txt(cells[11]),
        code:       txt(cells[12]),
      })
    }
  }

  return {
    columns: [
      { key: 'taxable',        label: 'Облагаем?',      editable: 'checkbox' },
      { key: 'taxExemptLabel', label: 'Данъчен статус', chip: true, chipColors: { 'Освободен': 'success', 'Облагаем': 'default' } },
      { key: 'symbol',         label: 'Symbol',         bold: true },
      { key: 'dateTime',   label: 'Trade Date/Time',    mono: true },
      //{ key: 'settleDate', label: 'Сетълмент',   mono: true },
      { key: 'exchange',   label: 'Exchange' },
      { key: 'currency',   label: 'Currency' },
      { key: 'type',       label: 'Type',         chip: true, chipColors: { BUY: 'primary', SELL: 'secondary' } },
      { key: 'quantity',   label: 'Quantity',  align: 'right', mono: true, decimals: 4 },
      { key: 'price',      label: 'Price',        align: 'right', mono: true, decimals: 4 },
      { key: 'proceeds',   label: 'Proceeds', align: 'right', mono: true, decimals: 2 },
      { key: 'comm',       label: 'Commission',    align: 'right', mono: true, decimals: 4 },
      { key: 'fee',        label: 'Fee',       align: 'right', mono: true, decimals: 2 },
      // { key: 'orderType',  label: 'Order Type' },
      //{ key: 'code',       label: 'Code' },
    ],
    rows,
  }
}
