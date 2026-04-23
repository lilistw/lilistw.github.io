import { useTranslation } from 'react-i18next';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, IconButton } from '@mui/material';
import { Close } from '@mui/icons-material';
import PrivacyPolicyContent from './PrivacyPolicyContent.jsx';

export default function PrivacyPolicyModal({ onClose }) {
  const { t } = useTranslation()
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth scroll="paper">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {t('privacy.title')}
        <IconButton size="small" onClick={onClose} aria-label={t('common.close')}>
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <PrivacyPolicyContent />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.close')}</Button>
      </DialogActions>
    </Dialog>
  )
}
