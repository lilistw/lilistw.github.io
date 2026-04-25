/**
 * Parses an IBKR Trade Confirmation PDF (PdfPage[]) into trade objects,
 * matching the format produced by parseTradesFromHtml().
 *
 * Column positions (IBKR landscape 792×612 PDF):
 *   Symbol≈96, DateTime≈182, SettleDate≈261, Exchange≈333, Side≈391,
 *   Qty≈462, Price≈529, Proceeds≈580, Comm≈625, Fee≈668, OrderType≈700, Code≈737
 *
 * Row types per page:
 *   Sub-header (first item col<30): asset category ("Stocks", "Forex") or currency ("EUR"/"USD")
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

      const first = items[0]

      // Sub-header: first item at far-left identifies asset category or currency.
      // AcktID appears at col≥38, so col<30 is safe for sub-headers only.
      if (first.col < 30) {
        const text = first.str
        if (text === 'Forex' || text === 'FX') {
          skipSection = true
          continue
        }
        if (/^Stocks?$|^Equit/i.test(text)) {
          skipSection = false
          asset = 'Stocks'
          continue
        }
        if (text === 'EUR' || text === 'USD') {
          currency = text
          continue
        }
        continue
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

      trades.push({
        asset:      asset    ?? '',
        currency:   currency ?? '',
        symbol,
        datetime:   pick(170, 225),
        settleDate: pick(248, 300),
        exchange,
        side:       pick(378, 435),
        quantity:   pick(450, 510),
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
