import { useTranslation } from 'react-i18next'
import { Box, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { WarningAmberOutlined } from '@mui/icons-material'

export default function EtfClassificationWarning() {
  const { t } = useTranslation()

  return (
    <Box sx={{
      mb: 2,
      p: 2,
      bgcolor: (theme) => theme.palette.mode === 'dark'
        ? alpha(theme.palette.warning.main, 0.10)
        : '#FFFBEB',
      border: '1px solid',
      borderColor: (theme) => theme.palette.mode === 'dark'
        ? alpha(theme.palette.warning.main, 0.25)
        : '#FCD34D',
      borderRadius: 2,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
        <WarningAmberOutlined sx={{ color: 'warning.main', mt: 0.15, flexShrink: 0 }} />
        <Box>
          <Typography variant="subtitle2" fontWeight={700} color="warning.dark" gutterBottom>
            {t('etfClassificationWarning.title')}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.7, display: 'block' }}>
            {t('etfClassificationWarning.line1')}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.7, display: 'block', mt: 0.5 }}>
            <strong>{t('etfClassificationWarning.attention')}</strong>{' '}
            {t('etfClassificationWarning.line2')}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.7, display: 'block', mt: 0.5 }}>
            {t('etfClassificationWarning.line3')}
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}
