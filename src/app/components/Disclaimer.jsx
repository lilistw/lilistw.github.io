import { Alert } from '@mui/material'
import { WarningAmber } from '@mui/icons-material'
import { t } from '../localization/i18n.js'
import { useLocale } from '../hooks/useLocale.js'

export default function Disclaimer() {
  useLocale()

  return (
    <Alert
      icon={<WarningAmber />}
      severity="warning"
      sx={{ mb: 2 }}
    >
      {t('disclaimer.text')}
    </Alert>
  )
}