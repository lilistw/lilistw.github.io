/**
 * Parses the Dividends and Withholding Tax sections.
 * Withholding entries are matched to their dividend by description prefix
 * (IBKR appends " - XX Tax" to the same description string).
 *
 * @param {string[][]} rows
 * @param {{ [symbol: string]: object }} instrumentInfo  from parseFinancialInstrumentInfo
 * @returns {{ columns: object[], rows: object[] }}
 */
export function parseDividends(rows, instrumentInfo = {}) {
  const divHeader = rows.find(r => r[0] === 'Dividends' && r[1] === 'Header')
  if (!divHeader) return { columns: [], rows: [] }

  const divIdx = {}
  for (let i = 2; i < divHeader.length; i++) divIdx[divHeader[i].trim()] = i

  // Build withholding map: dividendDescription → withheld amount (negative in CSV)
  const withholding = {}
  const whHeader = rows.find(r => r[0] === 'Withholding Tax' && r[1] === 'Header')
  if (whHeader) {
    const whIdx = {}
    for (let i = 2; i < whHeader.length; i++) whIdx[whHeader[i].trim()] = i

    rows
      .filter(r => r[0] === 'Withholding Tax' && r[1] === 'Data' &&
              !(r[whIdx['Currency']] || '').startsWith('Total'))
      .forEach(r => {
        // Strip " - US Tax" / " - DE Tax" / " - Tax" suffix to get the matching dividend desc
        const desc = (r[whIdx['Description']] || '').replace(/ - .+ Tax$/, '').trim()
        withholding[desc] = (withholding[desc] || 0) + (parseFloat(r[whIdx['Amount']]) || 0)
      })
  }

  const SKIP = new Set(['Total', 'Total in EUR', 'Total Dividends in EUR'])

  const dataRows = rows
    .filter(r =>
      r[0] === 'Dividends' &&
      r[1] === 'Data' &&
      !SKIP.has((r[divIdx['Currency']] || '').trim())
    )
    .map(r => {
      const currency    = r[divIdx['Currency']]
      const date        = r[divIdx['Date']]
      const description = (r[divIdx['Description']] || '').trim()
      const grossAmount = parseFloat(r[divIdx['Amount']]) || 0
      const symbol      = description.split(' ')[0]
      const info        = instrumentInfo[symbol] || {}
      const withheldTax = Math.abs(withholding[description] || 0)

      return {
        symbol,
        date,
        currency,
        description,
        grossAmount,
        withheldTax,
        netAmount:   grossAmount - withheldTax,
        country:     info.country     || '',
        countryName: info.countryName || '',
        taxCode:     withheldTax > 0 ? 1 : 3,   // 1 = credit, 3 = exemption
      }
    })
    .filter(r => r.grossAmount > 0)

  return {
    columns: [
      { key: 'date',        label: 'Дата',           mono: true },
      { key: 'symbol',      label: 'Символ',         bold: true },
      { key: 'countryName', label: 'Държава' },
      { key: 'currency',    label: 'Валута' },
      { key: 'grossAmount', label: 'Брутна сума',    align: 'right', mono: true, decimals: 2 },
      { key: 'withheldTax', label: 'Удържан данък',  align: 'right', mono: true, decimals: 2 },
      { key: 'netAmount',   label: 'Нетна сума',     align: 'right', mono: true, decimals: 2 },
      { key: 'taxCode',     label: 'Код' },
    ],
    rows: dataRows,
  }
}
