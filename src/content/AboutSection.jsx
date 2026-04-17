import {
  Box,
  Card,
  CardActions,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material'
import {
  ArticleOutlined,
  ShieldOutlined,
  TrendingUp,
} from '@mui/icons-material'
import { useState } from 'react'

const cards = [
  {
    icon: <ArticleOutlined fontSize="small" />,
    title: 'За какво служи',
    text:
      'Обработва Activity Statement от IBKR и изчислява облагаемите доходи от продажба на акции и от дивиденти за годишната данъчна декларация.',
    color: 'primary.main',
    bg: 'rgba(22,163,74,0.07)',
    actions: [],
  },
  {
    icon: <TrendingUp fontSize="small" />,
    title: 'Метод',
    text:
      'Среднопретеглена цена на придобиване по символ с конвертиране в BGN по курс на БНБ за датата на всяка сделка.',
    color: 'secondary.main',
    bg: 'rgba(79,70,229,0.07)',
    actions: [{ type: 'info', label: 'Още информация' }],
  },
  {
    icon: <ShieldOutlined fontSize="small" />,
    title: 'Поверителност',
    text:
      'Всичко се изпълнява в браузъра ви. Никакви данни не се качват или съхраняват.',
    color: 'warning.main',
    bg: 'rgba(217,119,6,0.07)',
    actions: [],
  },
]

export default function AboutSection() {
  const [open, setOpen] = useState(false)

  const handleActionClick = (actionType) => {
    if (actionType === 'info') {
      setOpen(true)
    }
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' },
        gap: 2,
        mt: 4,
      }}
    >
      {cards.map(({ icon, title, text, color, bg, actions = [] }) => (
        <Card key={title} variant="outlined" 
          sx={{ borderRadius: 2, 
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            }
          }}>
          <CardContent>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                mb: 1,
              }}
            >
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
              <Typography
                variant="subtitle2"
                fontWeight={700}
                color={color}
              >
                {title}
              </Typography>
            </Box>

            <Typography variant="body2" color="text.secondary">
              {text}
            </Typography>
          </CardContent>

          {actions.length > 0 && (
            <CardActions sx={{ px: 2, pb: 2, pt: 0, mt: -1.5, justifyContent: 'flex-end' }}>
              {actions.map((action) => (
                <Button
                  key={action.type}
                  size="small"
                  variant="text"
                  onClick={() => handleActionClick(action.type)}
                >
                  {action.label}
                </Button>
              ))}
            </CardActions>
          )}
        </Card>
      ))}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Как работи приложението</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, lineHeight: 1.8 }}>
            Това приложение анализира IBKR файловете от Activity Statement (CSV) и Trade Confirmation (HTML) и изчислява данъчните резултати за годишната декларация.
          </Typography>
          <Box component="ul" sx={{ pl: 3, mb: 1, color: 'text.secondary' }}>
            <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
              От Trade Confirmation се извличат всички сделки с количества, цени, комисиони и такси.
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
              От CSV Activity Statement се четат откритите позиции, информация за инструментите и цените на придобиване, които IBKR съхранява за предишни сделки.
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
              За всяка BUY сделка текущата позиция се натрупва като цена на придобиване плюс комисионни и такси, изразена в оригиналната валута и в BGN по курс на БНБ за датата на сделката. За предходни позиции BGN стойностите се справят към курс на 31.12.2025, а за EUR позиции от началото на 2026 г. насам се взима курсът за конкретния ден.
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
              За всяка SELL сделка приходът се взима като цена на продажба минус комисионни и такси, и се конвертира в BGN по курс на деня.
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
              При продажба на акции, ако вече има отделни покупки в текущата позиция, приложението изчислява среднопретеглена цена на придобиване за наличните акции. После използва тази средна цена, за да определи точния разход за продаденото количество, като така данъчната основа отразява и текущите, и предходните покупки.
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
              Ако символът липсва в текущите позиции и няма начална цена на придобиване от предходна година, приложението връща към IBKR CSV цената на придобиване за конкретната продажба и я маркира като приблизителна.
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, lineHeight: 1.8 }}>
            Табът "Позиции" показва отворените позиции за IBKR, като когато е възможно използва изчислената коригирана цена на придобиване. За символи без текущи покупки се използва потвърдената стойност от предходната година или цената на придобиване, предоставена от IBKR.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, lineHeight: 1.8 }}>
            Сумирането за Приложение №5 и Приложение №13 се прави върху BGN стойности: приходи с такси минус коригирана цена на придобиване, разделени на облагаеми и освободени акции според правилата за ETF на регулирани пазари.
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Това не е финансова или данъчна консултация. Информацията е ориентировъчна и служи само за помощ при попълване на данъчната декларация.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Затвори</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
