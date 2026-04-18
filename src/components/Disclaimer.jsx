import { WarningAmber } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

export default function Disclaimer() {
  const { t } = useTranslation();

  return (
    <div className="disclaimer">
      <WarningAmber className="disclaimer-icon" />
      <p>{t('disclaimer.text')}</p>
    </div>
  );
}