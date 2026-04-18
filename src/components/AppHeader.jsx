import { useTranslation } from 'react-i18next';
import { Tooltip, IconButton, Typography } from '@mui/material';
import { LightModeOutlined, DarkModeOutlined } from '@mui/icons-material';
import AboutSection from './AboutSection';

export default function AppHeader({ nightMode, setNightMode }) {
  const { t } = useTranslation();

  return (
    <header className="app-header">
      <Tooltip title={nightMode ? t('theme.switchDay') : t('theme.switchNight')} arrow>
        <IconButton
          onClick={() => setNightMode(n => !n)}
          size="small"
          sx={{
            position: 'absolute',
            top: 12,
            right: 16,
            zIndex: 2,
            color: 'rgba(255,255,255,0.7)',
            '&:hover': {
              color: '#fff',
              background: 'rgba(255,255,255,0.1)',
            },
          }}
        >
          {nightMode
            ? <LightModeOutlined fontSize="small" />
            : <DarkModeOutlined fontSize="small" />}
        </IconButton>
      </Tooltip>

      <div className="header-inner">
        <Typography variant="title" component="h1" sx={{ fontSize: 40, fontWeight: 700 }}>
          {t('app.title')}
        </Typography>

        <AboutSection />
      </div>
    </header>
  );
}