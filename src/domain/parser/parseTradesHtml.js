import { parseToDecimal, toDisplayStr } from '../../utils/numStr.js'

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
 * Each numeric field is stored as:
 *   field    – Decimal  (for calculations)
 *   fieldRaw – string   (original value with trailing zeros stripped, for display)
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
    const assetHeader = tbody.querySelector('td.header-asset')
    if (assetHeader) {
      const cat = assetHeader.textContent.trim()
      skipSection = cat === 'Forex' || cat === 'FX'
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

      // Parse numeric fields to Decimal; derive display strings (no trailing zeros)
      const qtyRaw   = txt(cells[6])
      const qtyD     = parseToDecimal(qtyRaw)

      const priceD   = parseToDecimal(txt(cells[7]))
      const procD    = parseToDecimal(txt(cells[8]))
      const commD    = parseToDecimal(txt(cells[9]))
      const feeD     = parseToDecimal(txt(cells[10]))

      rows.push({
        taxable:      true,
        symbol:       txt(cells[1]),
        dateTime:     txt(cells[2]),
        date:         txt(cells[2]).split(',')[0].trim(),
        settleDate:   txt(cells[3]),
        exchange,
        currency,
        type:         txt(cells[5]),

        // Decimal values — used for calculations
        quantity:  qtyD ? qtyD.abs() : null,
        price:     priceD,
        proceeds:  procD,
        comm:      commD,
        fee:       feeD,

        // Display strings — trailing zeros stripped, sign removed from quantity
        quantityRaw: qtyD  ? toDisplayStr(qtyD.abs()) : txt(cells[6]).replace('-', ''),
        priceRaw:    priceD ? toDisplayStr(priceD)     : txt(cells[7]),
        proceedsRaw: procD  ? toDisplayStr(procD)      : txt(cells[8]),
        commRaw:     commD  ? toDisplayStr(commD)      : txt(cells[9]),
        feeRaw:      feeD   ? toDisplayStr(feeD)       : txt(cells[10]),

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
      { key: 'dateTime',       label: 'Trade Date/Time', mono: true },
      { key: 'exchange',       label: 'Exchange' },
      { key: 'currency',       label: 'Currency' },
      { key: 'type',           label: 'Type',     chip: true, chipColors: { BUY: 'primary', SELL: 'secondary' } },
      { key: 'quantityRaw',    label: 'Quantity', align: 'right', mono: true },
      { key: 'priceRaw',       label: 'Price',    align: 'right', mono: true },
      { key: 'proceedsRaw',    label: 'Proceeds', align: 'right', mono: true },
      { key: 'commRaw',        label: 'Commission', align: 'right', mono: true },
      { key: 'feeRaw',         label: 'Fee',      align: 'right', mono: true },
    ],
    rows,
  }
}
