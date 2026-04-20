import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import DataTable from '../DataTable'
import TaxApp5 from './TaxApp5'
import TaxApp13 from './TaxApp13'
import PriorYearApproxWarning from '../PriorYearApproxWarning'
import { buildTradeTotals, buildTaxSummary } from '../../domain/tradeSummary'
import TaxableToggleDialog from './TaxableToggleDialog'
import { alpha } from '@mui/material/styles'
import { Box, Typography } from '@mui/material'
import { WarningOutlined } from '@mui/icons-material'


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
    () => rows.filter(r => r.side === 'SELL' && r.costBasisLclApprox),
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
      <DataTable
        title={t('app.tradesTableTitle')}
        data={trades}
        countLabel={t('app.countLabel.trades')}
        onCheckChange={handleToggle}
        hint={
          <Box sx={{
            display: 'flex', alignItems: 'flex-start', gap: 1,
            px: 2, py: 1,
            bgcolor: (theme) => theme.palette.mode === 'dark'
              ? alpha(theme.palette.primary.main, 0.10)
              : '#EFF6FF',
            borderBottom: '1px solid', borderColor: 'divider',
          }}>
            <WarningOutlined sx={{ fontSize: 15, color: 'warning.main', mt: 0.2, flexShrink: 0 }} />
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
              <strong>{t('etfClassificationWarning.title')}</strong>{' '}
              {t('etfClassificationWarning.line1')}{' '}
              {t('etfClassificationWarning.line2')}{' '}
              <strong>{t('etfClassificationWarning.attention')}</strong>{' '}
              {t('etfClassificationWarning.line3')}
            </Typography>
          </Box>
        }
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