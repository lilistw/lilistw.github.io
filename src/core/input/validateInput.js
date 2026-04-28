const SUPPORTED_CURRENCIES = new Set(['USD', 'EUR'])

/**
 * Validates that the parsed CSV rows come from an IBKR Activity Statement.
 * Throws a descriptive error if the structure is unrecognised.
 *
 * @param {string[][]} csvRows
 */
export function validateCsvContent(csvRows) {
  const hasIbkrMarker = csvRows.some(r => r[0] === 'Statement' && r[1] === 'Data')
  if (!hasIbkrMarker) {
    throw Object.assign(new Error('INVALID_CSV_FORMAT'), { code: 'INVALID_CSV_FORMAT' })
  }
}

/**
 * Validates that the parsed HTML document comes from an IBKR Trade Confirmation.
 * A valid but empty report (no trades) has at least the standard IBKR table structure.
 * Throws if the document looks nothing like a Trade Confirmation report.
 *
 * @param {Document} doc - parsed via DOMParser
 */
export function validateHtmlContent(doc) {
  // IBKR Trade Confirmation HTML always contains at least one <table> with
  // IBKR-specific class attributes (header-asset, header-currency, row-detail).
  // A non-IBKR HTML file will have none of these.
  const hasIbkrTable =
    doc.querySelector('td.header-asset') !== null ||
    doc.querySelector('td.header-currency') !== null ||
    doc.querySelector('tbody.row-detail') !== null

  // Also accept the case where the report exists but has no trades (empty period):
  // if the document has a <table> element at all it could be a real empty report.
  const hasTable = doc.querySelector('table') !== null

  if (!hasIbkrTable && !hasTable) {
    throw Object.assign(new Error('INVALID_HTML_FORMAT'), { code: 'INVALID_HTML_FORMAT' })
  }

  if (!hasIbkrTable && hasTable) {
    // Has tables but no IBKR-specific markers — likely wrong file type
    throw Object.assign(new Error('INVALID_HTML_FORMAT'), { code: 'INVALID_HTML_FORMAT' })
  }
}

/**
 * Validates that adapted PDF rows contain the IBKR Statement marker.
 * Throws if the PDF was not an Activity Statement or extraction failed.
 *
 * @param {string[][]} rows - result of PdfToCsvAdapter.adapt()
 */
export function validatePdfContent(rows) {
  const hasIbkrMarker = rows.some(r => r[0] === 'Statement' && r[1] === 'Data')
  if (!hasIbkrMarker) {
    throw Object.assign(new Error('INVALID_PDF_FORMAT'), { code: 'INVALID_PDF_FORMAT' })
  }
}

/**
 * Validates that all parsed HTML trades use a supported currency (USD or EUR).
 * FX rates are only available for these two currencies.
 *
 * @param {object[]} trades - result of parseTradesFromHtml
 */
export function validateTradeCurrencies(trades) {
  for (const trade of trades) {
    if (trade.currency && !SUPPORTED_CURRENCIES.has(trade.currency)) {
      throw Object.assign(new Error('UNSUPPORTED_CURRENCY'), { code: 'UNSUPPORTED_CURRENCY', currency: trade.currency })
    }
  }
}
