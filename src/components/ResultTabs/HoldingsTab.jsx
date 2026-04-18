import { useTranslation } from 'react-i18next'
import { Box, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { ReceiptLongOutlined } from '@mui/icons-material'
import DataTable from '../DataTable.jsx'

const COLUMNS_WITHOUT_TYPE = (columns) =>
  columns.filter(c => c.key !== 'type')

function addRowNumbers(rows) {
  return rows.map((r, i) => ({ '#': i + 1, ...r }))
}

const NUM_COL = { key: '#', label: '#', align: 'right', mono: true, decimals: 0 }

function HoldingsSubTable({ label, data, type, countLabel }) {
  const rows = data.rows.filter(r => r.type === type)
  if (rows.length === 0) return null
  const columns = [NUM_COL, ...COLUMNS_WITHOUT_TYPE(data.columns)]
  return (
    <DataTable title={label} data={{ columns, rows: addRowNumbers(rows) }} countLabel={countLabel} embedded sx={{ mb: 2 }} />
  )
}

export default function TaxApp8Holdings({ result }) {
  const data = result.taxSummary.app8Holdings;
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
            {t('taxApp8Holdings.title')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
            Съгласно <strong>{t('taxApp8Holdings.legalRef')}</strong> {t('taxApp8Holdings.bodyLine1')}{' '}
            <strong>{t('taxApp8Holdings.bodyMustDeclare')}</strong> {t('taxApp8Holdings.bodyLine2')}
          </Typography>
        </Box>
      </Box>
      <HoldingsSubTable label={t('taxApp8Holdings.shares')} data={data} type="Акции" countLabel={t('taxApp8Holdings.countLabel')} />
      <HoldingsSubTable label={t('taxApp8Holdings.funds')}  data={data} type="Дялове" countLabel={t('taxApp8Holdings.countLabel')} />
    </Box>
  )
}
