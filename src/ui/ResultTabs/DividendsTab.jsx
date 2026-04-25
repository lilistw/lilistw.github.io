import { useTranslation } from 'react-i18next'
import { Box, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { ReceiptLongOutlined } from '@mui/icons-material'
import DataTable from './DataTable.jsx'
import { DividendPresenter } from '../../presentation/DividendPresenter.js'

export default function DividendsTab({ result }) {
  // --- DIVIDENDS (presentation) ---
  const data = new DividendPresenter({
    lcl: result.localCurrencyLabel,
  }).buildDividendsTable(result.dividends)
  const { t } = useTranslation()
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
            {t('taxApp8Dividends.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
            {t('taxApp8Dividends.bodyLine1')} <strong>{t('taxApp8Dividends.taxRate')}</strong>{' '}
            {t('taxApp8Dividends.bodyLine2')}{' '}
            <em>{t('taxApp8Dividends.withheldTax')}</em>{t('taxApp8Dividends.bodyLine3')}
            <strong>{t('taxApp8Dividends.taxCredit')}</strong>).
          </Typography>
        </Box>
      </Box>
      <DataTable title={t('taxApp8Dividends.tableTitle')} columns={data.columns} rows={data.rows} countLabel={t('taxApp8Dividends.countLabel')} embedded />
    </Box>
  )
}
