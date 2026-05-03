import { t, getLanguage, setLanguage } from '../localization/i18n.js'
import { Typography, Box } from '@mui/material';
import { LightModeOutlined, DarkModeOutlined } from '@mui/icons-material';
import AboutSection from './AboutSection';

export default function AppHeader({ nightMode, setNightMode }) {
  const handleLanguageToggle = () => {
    const newLanguage = getLanguage() === 'bg' ? 'en' : 'bg'
    setLanguage(newLanguage)
    // Trigger re-render by setting a temporary state or using a context
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: newLanguage }))
  }

  return (
    <header className="app-header">
      <Box sx={{ display: 'flex', gap: 1, position: 'absolute', top: 16, right: 20, zIndex: 2, alignItems: 'center' }}>
        {/* Language Toggle */}
        <Box
          onClick={handleLanguageToggle}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 1.5,
            py: 0.6,
            borderRadius: 999,
            cursor: 'pointer',
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
          <Typography variant="caption" sx={{ fontWeight: 500 }}>
            {getLanguage().toUpperCase()}
          </Typography>
        </Box>

        {/* Theme Toggle */}
        <Box
          onClick={() => setNightMode(n => !n)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 1.5,
            py: 0.6,
            borderRadius: 999,
            cursor: 'pointer',
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