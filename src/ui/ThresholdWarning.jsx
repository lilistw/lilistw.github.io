import { useTranslation } from 'react-i18next'
import { Box, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { WarningAmberOutlined } from '@mui/icons-material'

const EUR_BGN = 1.95583
const SPB8_THRESHOLD_EUR = 25000

function totalToEur(totalLcl, localCurrencyCode) {
  if (localCurrencyCode === 'EUR') return totalLcl
  return totalLcl / EUR_BGN
}

function fmtNum(n) {
  return Number(n).toLocaleString('bg-BG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function ThresholdWarning({ holdings, localCurrencyLabel, localCurrencyCode }) {
  const { t } = useTranslation()

  const totalLcl = holdings.reduce((sum, h) => sum + (h.costLcl ?? 0), 0)
  if (totalToEur(totalLcl, localCurrencyCode) <= SPB8_THRESHOLD_EUR) return null

  const details = t('spb8Warning.details', { returnObjects: true })

  return (
    <Box sx={{
      display: 'flex', alignItems: 'flex-start', gap: 1.5,
      p: 2, mt: 2,
      bgcolor: (theme) => theme.palette.mode === 'dark'
        ? alpha(theme.palette.warning.main, 0.10)
        : '#FFFBEB',
      border: '1px solid',
      borderColor: (theme) => theme.palette.mode === 'dark'
        ? alpha(theme.palette.warning.main, 0.25)
        : '#FCD34D',
      borderRadius: 2,
    }}>
      <WarningAmberOutlined sx={{ fontSize: 20, color: 'warning.main', mt: 0.1, flexShrink: 0 }} />
      <Box>
        <Typography variant="subtitle2" fontWeight={700} color="warning.dark" gutterBottom>
          {t('spb8Warning.title')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, mb: 0.75 }}>
          {t('spb8Warning.body')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {t('spb8Warning.totalLine', { total: fmtNum(totalLcl), currency: localCurrencyLabel })}
        </Typography>
        <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
          {details.map((d, i) => (
            <Box component="li" key={i}>
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                {d}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  )
}
