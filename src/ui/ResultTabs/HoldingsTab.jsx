import { t } from '../../localization/translate.js'
import { Box, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { ReceiptLongOutlined } from '@mui/icons-material'
import DataTable from './DataTable.jsx'
import { HoldingPresenter } from '../../presentation/HoldingPresenter.js'
import ThresholdWarning from '../ThresholdWarning.jsx'

function addRowNumbers(rows) {
  let i = 1
  return rows.map((r) => (r._subtitle ? r : { '#': i++, ...r }))
}

const NUM_COL = { key: '#', label: '#', align: 'right', mono: true, decimals: 0 }

export default function TaxApp8Holdings({ result }) {
  const holdingsPresenter = new HoldingPresenter({
    lcl: result.localCurrencyLabel
  })

  const data = holdingsPresenter.buildHoldings(result.holdings)
  if (!data || data.rows.length === 0) return null
  return (
    <Box>
      <Box sx={{
        display: 'flex', alignItems: 'flex-start', gap: 1.5,
        p: 2, mb: 2,
        bgcolor: (theme) => theme.palette.mode === 'dark'
          ? alpha(theme.palette.warning.main, 0.10)
          : '#FFFBEB',
        border: '1px solid',
        borderColor: (theme) => theme.palette.mode === 'dark'
          ? alpha(theme.palette.warning.main, 0.25)
          : '#FCD34D',
        borderRadius: 2,
      }}>
        <ReceiptLongOutlined sx={{ fontSize: 20, color: 'warning.main', mt: 0.1, flexShrink: 0 }} />
        <Box>
          <Typography variant="subtitle2" fontWeight={700} color="warning.dark" gutterBottom>
            {t('taxApp8Holdings.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
            Съгласно <strong>{t('taxApp8Holdings.legalRef')}</strong> {t('taxApp8Holdings.bodyLine1')}{' '}
            <strong>{t('taxApp8Holdings.bodyMustDeclare')}</strong> {t('taxApp8Holdings.bodyLine2')}
          </Typography>
        </Box>
      </Box>
      <DataTable
        columns={[NUM_COL, ...data.columns]}
        rows={addRowNumbers(data.rows)}
        countLabel={t('taxApp8Holdings.countLabel')}
        embedded
        sx={{ mb: 2 }}
      />
      <ThresholdWarning
        holdings={result.holdings}
        localCurrencyLabel={result.localCurrencyLabel}
        localCurrencyCode={result.localCurrencyCode}
      />
    </Box>
  )
}
