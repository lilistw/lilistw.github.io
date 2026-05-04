import { useState, useMemo } from 'react'
import { t } from '../../localization/i18n.js'
import { useLocale } from '../../hooks/useLocale.js'
import DataTable from './DataTable'
import TaxSummary from './TaxSummary'
import PriorYearApproxWarning from '../PriorYearApproxWarning'
import TaxableToggleDialog from './TaxableToggleDialog'
import { alpha } from '@mui/material/styles'
import { Box, Typography } from '@mui/material'
import { WarningOutlined } from '@mui/icons-material'
import { TradePresenter } from '../presentation/TradePresenter.js'
import { useTradesViewModel } from '../../hooks/useTradesViewModel.js'

export default function TradesTab({ result }) {
  const { localCurrencyCode, localCurrencyLabel } = result.taxContext
  const language = useLocale()

  // Raw Decimal rows (no _total rows); updated when user toggles taxable status
  const [rawRows, setRawRows] = useState(
    () => result.trades.filter(r => !r._total)
  )

  const tradePresenter = useMemo(
    () => new TradePresenter({ lcl: localCurrencyLabel }),
    [localCurrencyLabel, language]
  )

  const { columns, rows, taxSummary } = useTradesViewModel({
    rawRows,
    localCurrencyCode,
    presenter: tradePresenter
  })

  const approxRows = useMemo(
    () => rawRows.filter(r => r.side === 'SELL' && r.costBasisLclApprox),
    [rawRows]
  )

  const [pending, setPending] = useState(null)

  function handleToggle(idx) {
    const row = rawRows[idx]
    if (!row || row.taxable === null) return

    const newTaxable = !row.taxable
    const newLabel = newTaxable
      ? t('app.taxStatus.taxable')
      : t('app.taxStatus.exempt')

    // store only minimal data (no stale row)
    setPending({ idx, newTaxable, newLabel })
  }

  function confirm() {
    if (!pending) return

    setRawRows(prev =>
      prev.map((r, i) =>
        i === pending.idx
          ? { ...r, taxable: pending.newTaxable }
          : r
      )
    )

    setPending(null)
  }

  // always derive fresh row from current state
  const pendingWithRow = pending
    ? { ...pending, row: rawRows[pending.idx] }
    : null

  return (
    <>
      <DataTable
        title={t('app.tradesTableTitle')}
        columns={columns}
        rows={rows}
        countLabel={t('app.countLabel.trades')}
        onToggle={handleToggle}
        hint={
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 1,
              px: 2,
              py: 1,
              bgcolor: (theme) =>
                theme.palette.mode === 'dark'
                  ? alpha(theme.palette.primary.main, 0.10)
                  : '#EFF6FF',
              borderBottom: '1px solid',
              borderColor: 'divider',
            }}
          >
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

      <PriorYearApproxWarning rows={approxRows} taxContext={result.taxContext} />

      <TaxSummary taxSummary={taxSummary} localCurrencyLabel={localCurrencyLabel} />

      <TaxableToggleDialog
        pending={pendingWithRow}
        onClose={() => setPending(null)}
        onConfirm={confirm}
      />
    </>
  )
}