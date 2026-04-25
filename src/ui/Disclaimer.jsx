import { Alert } from '@mui/material'
import { WarningAmber } from '@mui/icons-material'
import { t } from '../localization/translate.js'

export default function Disclaimer() {

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