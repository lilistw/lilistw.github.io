import { useMemo } from 'react'
import { calculateTotals } from '@core/services/tradeSummary'

export function useTradesViewModel({
  rawRows,
  localCurrencyCode,
  presenter
}) {
  const columns = useMemo(
    () => presenter.buildColumns(),
    [presenter]
  )

  const { rows, taxSummary } = useMemo(() => {
    // single domain entry
    const { totals, taxSummary } = calculateTotals(rawRows, localCurrencyCode)

    // presentation
    const displayRows = presenter.buildRows(rawRows)
    const displayTotals = presenter.buildRows(totals)

    return {
      rows: [...displayRows, ...displayTotals],
      taxSummary
    }
  }, [rawRows, localCurrencyCode, presenter])

  return {
    columns,
    rows,
    taxSummary
  }
}