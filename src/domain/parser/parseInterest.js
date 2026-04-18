/**
 * Parses the "Interest" section (actual monthly cash payments).
 * Interest Accruals is a separate balance-sheet summary included here for context.
 *
 * @param {string[][]} rows
 * @returns {{ columns: object[], rows: object[], accruals: object[] }}
 */
export function parseInterest(rows) {
  const header = rows.find(r => r[0] === 'Interest' && r[1] === 'Header')
  if (!header) return { columns: [], rows: [], accruals: [] }

  const idx = {}
  for (let i = 2; i < header.length; i++) idx[header[i].trim()] = i

  const SKIP = new Set(['Total', 'Total in EUR', 'Total Interest in EUR'])

  const dataRows = rows
    .filter(r =>
      r[0] === 'Interest' &&
      r[1] === 'Data' &&
      !SKIP.has((r[idx['Currency']] || '').trim())
    )
    .map(r => ({
      date:        (r[idx['Date']]        || '').trim(),
      currency:    (r[idx['Currency']]    || '').trim(),
      description: (r[idx['Description']] || '').trim(),
      amount:      parseFloat(r[idx['Amount']]) || 0,
    }))
    .filter(r => r.amount > 0)

  // Interest Accruals — balance-sheet summary (informational, not taxable events)
  const accHeader = rows.find(r => r[0] === 'Interest Accruals' && r[1] === 'Header')
  const accruals = []
  if (accHeader) {
    const aIdx = {}
    for (let i = 2; i < accHeader.length; i++) aIdx[accHeader[i].trim()] = i
    rows
      .filter(r => r[0] === 'Interest Accruals' && r[1] === 'Data')
      .forEach(r => {
        const currency = (r[aIdx['Currency']] || '').trim()
        if (!currency) return
        accruals.push({
          currency,
          startingBalance: parseFloat(r[aIdx['Starting Accrual Balance']]) || 0,
          interestAccrued: parseFloat(r[aIdx['Interest Accrued']])         || 0,
          accrualReversal: parseFloat(r[aIdx['Accrual Reversal']])         || 0,
          fxTranslation:   parseFloat(r[aIdx['FX Translation']])           || 0,
          endingBalance:   parseFloat(r[aIdx['Ending Accrual Balance']])   || 0,
        })
      })
  }

  return {
    columns: [
      { key: 'date',        label: 'Дата',    mono: true },
      { key: 'currency',    label: 'Валута' },
      { key: 'description', label: 'Описание' },
      { key: 'amount',      label: 'Сума',    align: 'right', mono: true, decimals: 2 },
    ],
    rows: dataRows,
    accruals,
  }
}
