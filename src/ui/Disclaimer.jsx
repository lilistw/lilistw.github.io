import { Alert } from '@mui/material'
import { WarningAmber } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'

export default function Disclaimer() {
  const { t } = useTranslation()

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