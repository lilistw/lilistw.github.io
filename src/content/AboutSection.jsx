import { Box, Card, CardContent, Typography } from '@mui/material'
import { ArticleOutlined, ShieldOutlined, TrendingUp } from '@mui/icons-material'

const cards = [
  {
    icon: <ArticleOutlined fontSize="small" />,
    title: 'За какво служи',
    text: 'Обработва Activity Statement от IBKR и изчислява облагаемите доходи от продажба на акции и от дивиденти за годишната данъчна декларация.',
    color: 'primary.main',
    bg: 'rgba(22,163,74,0.07)',
  },
  {
    icon: <TrendingUp fontSize="small" />,
    title: 'Метод',
    text: 'Среднопретеглена цена на придобиване по символ с конвертиране в BGN по курс на БНБ за датата на всяка сделка.',
    color: 'secondary.main',
    bg: 'rgba(79,70,229,0.07)',
  },
  {
    icon: <ShieldOutlined fontSize="small" />,
    title: 'Поверителност',
    text: 'Всичко се изпълнява в браузъра ви. Никакви данни не се качват или съхраняват.',
    color: 'warning.main',
    bg: 'rgba(217,119,6,0.07)',
  },
]

export default function AboutSection() {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
        gap: 2,
        mb: 3,
      }}
    >
      {cards.map(({ icon, title, text, color, bg }) => (
        <Card key={title} variant="outlined" sx={{ borderRadius: 2 }}>
          <CardContent>
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
            <Typography variant="body2" color="text.secondary">
              {text}
            </Typography>
          </CardContent>
        </Card>
      ))}
    </Box>
  )
}
