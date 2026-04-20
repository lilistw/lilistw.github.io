import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, IconButton } from '@mui/material'
import { Close } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'

export default function TaxableToggleDialog({ pending, onClose, onConfirm }) {
  const { t } = useTranslation()

  if (!pending) return null

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
          <strong>{pending.row.symbol}</strong> · {pending.row.dateTime}
        </Typography>

        <Typography variant="body2">
          {pending.row.taxExemptLabel} → <strong>{pending.newLabel}</strong>
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