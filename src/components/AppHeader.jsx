import { useTranslation } from 'react-i18next';
import { Typography, Box } from '@mui/material';
import { LightModeOutlined, DarkModeOutlined } from '@mui/icons-material';
import AboutSection from './AboutSection';

export default function AppHeader({ nightMode, setNightMode }) {
  const { t } = useTranslation();

  return (
    <header className="app-header">
      <Box
        onClick={() => setNightMode(n => !n)}
        sx={{
          position: 'absolute',
          top: 16,
          right: 20,
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1.5,
          py: 0.6,
          borderRadius: 999,
          cursor: 'pointer',

          // 👇 THIS makes it look like a button
          background: 'rgba(0,0,0,0.18)',
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(255,255,255,0.15)',

          color: '#fff',
          transition: 'all 0.2s ease',

          '&:hover': {
            background: 'rgba(0,0,0,0.28)',
          },
          '&:active': {
            transform: 'scale(0.97)',
          },
        }}
      >
        {nightMode ? (
          <LightModeOutlined fontSize="small" />
        ) : (
          <DarkModeOutlined fontSize="small" />
        )}

        <Typography variant="caption" sx={{ fontWeight: 500 }}>
          {nightMode ? t('theme.light') : t('theme.dark')}
        </Typography>
      </Box>

      <div className="header-inner">
        <Typography variant="title" component="h1" sx={{ fontSize: 40, fontWeight: 700 }}>
          {t('app.title')}
        </Typography>

        <AboutSection />
      </div>
    </header>
  );
}