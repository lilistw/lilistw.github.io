/**
 * Parses an IBKR Trade Confirmation PDF (PdfPage[]) into trade objects,
 * matching the format produced by parseTradesFromHtml().
 *
 * Column positions (IBKR landscape 792×612 PDF):
 *   Symbol≈96, DateTime≈182, SettleDate≈261, Exchange≈333, Side≈391,
 *   Qty≈462, Price≈529, Proceeds≈580, Comm≈625, Fee≈668, OrderType≈700, Code≈737
 *
 * Row types per page:
 *   Sub-header (single text item): asset category ("Stocks", "Forex") or currency ("EUR"/"USD")
 *   Summary row (AcktID col≈38, exchange="-"): aggregate — skip
 *   Detail row (AcktID col≈44, actual exchange): execution — emit
 *
 * @param {import('../../../io/readPdf.js').PdfPage[]} pages
 * @returns {object[]}
 */
export function parseTradePdf(pages) {
  const trades = []
  let asset = null
  let currency = null
  let skipSection = false

  for (const page of pages) {
    for (const pRow of page.rows) {
      const items = pRow.items
      if (!items.length) continue

      // Sub-header rows contain a single text item — never trade rows which always
      // have many columns (AcktID, symbol, date, exchange, qty, price, …).
      if (items.length === 1) {
        const text = items[0].str.trim()
        if (/^(forex|fx)$/i.test(text)) { skipSection = true; continue }
        if (/^stocks?$/i.test(text) || /^equit/i.test(text)) { skipSection = false; asset = 'Stocks'; continue }
        if (/^options?$/i.test(text)) { skipSection = false; asset = 'Options'; continue }
        if (/^bonds?$/i.test(text)) { skipSection = false; asset = 'Bonds'; continue }
        if (/^(EUR|USD|GBP|CHF|JPY|CAD|AUD|HKD|SEK|NOK|DKK|SGD|NZD|MXN|ZAR)$/.test(text)) {
          currency = text; continue
        }
        continue  // page title, account header, totals, etc.
      }

      if (skipSection) continue

      // Distinguish summary rows (AcktID col≈38) from detail rows (AcktID col≈44).
      // Only detail rows carry the actual execution exchange.
      const acktItem = items.find(i => i.col >= 33 && i.col < 55)
      if (!acktItem) continue
      if (acktItem.col < 42) continue // summary row — skip

      const pick = (min, max) => items.find(i => i.col >= min && i.col < max)?.str ?? ''

      const exchange = pick(315, 375)
      if (!exchange || exchange === '-') continue

      const symbol = pick(85, 130)
      if (!symbol) continue
      // Belt-and-suspenders: skip forex pair trades even when the "Forex"
      // sub-header row is not detected (e.g. it has more than one PDF item).
      if (/^[A-Z]{3}\.[A-Z]{3}$/.test(symbol)) continue

      const quantity = pick(450, 510)
      if (!quantity) continue // non-parseable row (page header, totals, etc.)

      // Normalise side to uppercase to match parseTradesFromHtml output
      const rawSide = pick(378, 435)
      const side = rawSide.toUpperCase() === 'SELL' ? 'SELL' : 'BUY'

      // Normalise quantity sign: negative for SELL, positive for BUY (HTML convention)
      const qtyStr = quantity.replace(/^-/, '')
      const normQty = side === 'SELL' ? `-${qtyStr}` : qtyStr

      trades.push({
        asset:      asset    ?? '',
        currency:   currency ?? '',
        symbol,
        datetime:   pick(170, 225),
        settleDate: pick(248, 300),
        exchange,
        side,
        quantity:   normQty,
        price:      pick(510, 565),
        proceeds:   pick(563, 625),
        commission: pick(615, 655),
        fee:        pick(655, 698),
        orderType:  pick(698, 735),
        code:       pick(730, 800),
      })
    }
  }

  return trades
}
