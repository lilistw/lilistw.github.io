import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import DataTable from '../DataTable'
import TaxApp5 from './TaxApp5'
import TaxApp13 from './TaxApp13'
import PriorYearApproxWarning from '../PriorYearApproxWarning'
import EtfClassificationWarning from '../EtfClassificationWarning'
import { buildTradeTotals, buildTaxSummary } from '../../domain/tradeSummary'
import TaxableToggleDialog from './TaxableToggleDialog'

export default function TradesTab({ result }) {
  const { t } = useTranslation()

  const { taxYear, localCurrencyCode, localCurrencyLabel } = result

  const [rows, setRows] = useState(
    result.trades.rows.filter(r => !r._total)
  )

  const trades = useMemo(() => ({
    columns: result.trades.columns,
    rows: [...rows, ...buildTradeTotals(rows, localCurrencyCode)],
  }), [rows, localCurrencyCode])

  const taxSummary = useMemo(() => buildTaxSummary(rows), [rows])

  const approxRows = useMemo(
    () => rows.filter(r => r.side === 'SELL' && r.costBasisBGNApprox),
    [rows]
  )

  const [pending, setPending] = useState(null)

  function handleToggle(idx) {
    const row = rows[idx]
    if (row.taxable === null) return

    const newTaxable = !row.taxable
    const newLabel = newTaxable
      ? t('app.taxStatus.taxable')
      : t('app.taxStatus.exempt')

    // ✅ store only minimal data (no stale row)
    setPending({ idx, newTaxable, newLabel })
  }

  function confirm() {
    if (!pending) return

    setRows(prev =>
      prev.map((r, i) =>
        i === pending.idx
          ? {
              ...r,
              taxable: pending.newTaxable,
              taxExemptLabel: pending.newLabel,
            }
          : r
      )
    )

    setPending(null)
  }

  // ✅ always derive fresh row from current state
  const pendingWithRow = pending
    ? { ...pending, row: rows[pending.idx] }
    : null

  return (
    <>
      <EtfClassificationWarning />

      <DataTable
        title={t('app.tradesTableTitle')}
        data={trades}
        countLabel={t('app.countLabel.trades')}
        onCheckChange={handleToggle}
      />

      <PriorYearApproxWarning rows={approxRows} taxYear={taxYear} />

      <TaxApp5 summary={taxSummary.app5} localCurrencyLabel={localCurrencyLabel} />
      <TaxApp13 summary={taxSummary.app13} localCurrencyLabel={localCurrencyLabel} />

      <TaxableToggleDialog
        pending={pendingWithRow}
        onClose={() => setPending(null)}
        onConfirm={confirm}
      />
    </>
  )
}