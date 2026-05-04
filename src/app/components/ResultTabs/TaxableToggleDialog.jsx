import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, IconButton } from '@mui/material'
import { Close } from '@mui/icons-material'
import { t } from '../../localization/i18n.js'
import { useLocale } from '../../hooks/useLocale.js'

export default function TaxableToggleDialog({ pending, onClose, onConfirm }) {
  useLocale()

  if (!pending) return null

  const currentLabel = pending.row.taxable
    ? t('app.taxStatus.taxable')
    : t('app.taxStatus.exempt')

  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between' }}>
        {t('app.changeStatusDialog.title')}
        <IconButton size="small" onClick={onClose}>
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Typography variant="body2">
          <strong>{pending.row.symbol}</strong> · {pending.row.datetime}
        </Typography>

        <Typography variant="body2">
          {currentLabel} → <strong>{pending.newLabel}</strong>
        </Typography>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="contained" onClick={onConfirm}>
          {t('common.confirm')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
