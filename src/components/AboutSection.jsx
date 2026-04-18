import {
  Box,
  Card,
  CardActions,
  CardContent,
  Typography,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  CardActionArea,
  Button,
} from '@mui/material';
import {
  ArticleOutlined,
  ShieldOutlined,
  TrendingUp,
} from '@mui/icons-material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function AboutSection() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const cardSx = {
    borderRadius: 2,
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
    },
  };

  const headerRow = (icon, color, bg, title) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          borderRadius: '50%',
          bgcolor: bg,
          color,
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>

      <Typography variant="subtitle2" fontWeight={700} color={color}>
        {title}
      </Typography>
    </Box>
  );

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
        gap: 2,
        mt: 4,
      }}
    >
      {/* Card 1 */}
      <Card variant="outlined" sx={cardSx}>
        <CardActionArea
          sx={{ flexGrow: 1, display: 'flex', alignItems: 'flex-start' }}
          onClick={() => setOpen(true)}
        >
          <CardContent   sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
          }}>
            {headerRow(
              <ArticleOutlined fontSize="small" />,
              'primary.main',
              'rgba(22,163,74,0.07)',
              t('about.cards.purpose.title')
            )}

            <Typography variant="body2" color="text.secondary">
              {t('about.cards.purpose.text')}
            </Typography>
          </CardContent>
        </CardActionArea>
      </Card>

      {/* Card 2 */}
      <Card variant="outlined" sx={cardSx}>
        <CardActionArea
          sx={{ flexGrow: 1, display: 'flex', alignItems: 'flex-start' }}
          onClick={() => setOpen(true)}
        >
          <CardContent   sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
          }}>
            {headerRow(
              <TrendingUp fontSize="small" />,
              'secondary.main',
              'rgba(79,70,229,0.07)',
              t('about.cards.method.title')
            )}

            <Typography variant="body2" color="text.secondary">
              {t('about.cards.method.text')}
            </Typography>
          </CardContent>
        </CardActionArea>
      </Card>

      {/* Card 3 (Поверителност - with blue text) */}
      <Card variant="outlined" sx={cardSx}>
        <CardActionArea
          sx={{ flexGrow: 1, display: 'flex', alignItems: 'flex-start' }}
          onClick={() => setOpen(true)}
        >
          <CardContent   sx={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
          }}>
            {headerRow(
              <ShieldOutlined fontSize="small" />,
              'warning.main',
              'rgba(217,119,6,0.07)',
              t('about.cards.privacy.title')
            )}

            <Typography variant="body2" color="text.secondary">
              {t('about.cards.privacy.text')}
            </Typography>

            <Box
              sx={{
                mt: 'auto',
                pt: 2,
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <Button
                  size="small"
                  variant="text"
                >
                  {t('about.actions.moreInfo')}
                </Button>
            </Box>
          </CardContent>
        </CardActionArea>
      </Card>

      {/* Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{t('about.dialog.title')}</DialogTitle>

        <DialogContent dividers>
          <Typography sx={{ mb: 1.5, lineHeight: 1.8 }}>
            {t('about.dialog.intro')}
          </Typography>

          <Box component="ul" sx={{ pl: 3, mb: 1 }}>
            {t('about.dialog.steps', { returnObjects: true }).map((step, i) => (
              <Typography key={i} component="li" sx={{ mb: 0.5 }}>
                {step}
              </Typography>
            ))}
          </Box>

          <Typography sx={{ mb: 1.5, lineHeight: 1.8 }}>
            {t('about.dialog.positions')}
          </Typography>

          <Typography sx={{ mb: 1.5, lineHeight: 1.8 }}>
            {t('about.dialog.summary')}
          </Typography>

          <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
            {t('about.dialog.disclaimer')}
          </Typography>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpen(false)}>
            {t('common.close')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}