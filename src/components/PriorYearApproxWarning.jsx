import { Box, Typography } from '@mui/material'
import { WarningAmberOutlined } from '@mui/icons-material'
import { fmt } from '../utils/fmt.js'
import { PREV_YEAR_END_DATE, findUsdRate } from '../domain/fx/fxRates.js'

const PREV_RATE_USD = findUsdRate(PREV_YEAR_END_DATE)

function fmtDate(dateStr) {
  // 'YYYY-MM-DD' → 'DD.MM.YYYY'
  if (!dateStr) return dateStr
  const [y, m, d] = dateStr.split('-')
  return `${d}.${m}.${y}`
}

export default function PriorYearApproxWarning({ rows }) {
  if (!rows || rows.length === 0) return null

  const prevYearLabel = PREV_YEAR_END_DATE.slice(0, 4)  // '2024'

  return (
    <Box sx={{
      mt: 2, mb: 1,
      p: 2,
      bgcolor: '#FFFBEB',
      border: '1px solid',
      borderColor: 'warning.light',
      borderRadius: 2,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1 }}>
        <WarningAmberOutlined sx={{ color: 'warning.main', mt: 0.15, flexShrink: 0 }} />
        <Box>
          <Typography variant="subtitle2" fontWeight={700} color="warning.dark" gutterBottom>
            Приблизителна цена на придобиване в лева — позиции от предходна година
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.7, display: 'block' }}>
            За посочените по-долу сделки не са открити данни за покупка в текущата отчетна година.
            Цената на придобиване в лева е изчислена по фиксирания курс на БНБ към края на {prevYearLabel} г.
            ({fmtDate(PREV_YEAR_END_DATE)}
            {PREV_RATE_USD != null ? ` — 1 USD = ${fmt(PREV_RATE_USD, 4)} лв` : ''}).
            {' '}Действителната стойност може да се различава, ако акциите са придобити при различен курс
            в рамките на {prevYearLabel} г. Препоръчваме да проверите точния курс на придобиване
            в историята на сделките си и при необходимост да коригирате стойността ръчно.
          </Typography>
        </Box>
      </Box>

      <Box component="ul" sx={{ m: 0, pl: 3.5 }}>
        {rows.map((r, i) => (
          <Box component="li" key={i} sx={{ mb: 0.5 }}>
            <Typography variant="caption" color="text.primary" sx={{ lineHeight: 1.8 }}>
              <strong>{r.symbol}</strong>
              {' — продажба на '}<strong>{r.quantity} бр.</strong>
              {' @ '}{fmt(r.price, 2)} {r.currency}
              {' на '}{fmtDate(r.date)}
              {r.costBasis != null && (
                <>
                  {' · цена на придобиване: '}
                  <strong>{fmt(r.costBasis, 2)} {r.currency}</strong>
                  {r.costBasisBGN != null && (
                    <> {' ≈ '}<strong>{fmt(r.costBasisBGN, 2)} лв</strong> <em>(приблизително)</em></>
                  )}
                </>
              )}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  )
}
