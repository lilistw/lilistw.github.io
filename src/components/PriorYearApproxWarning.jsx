import { Box, Typography } from '@mui/material'
import { WarningAmberOutlined } from '@mui/icons-material'
import {
  findUsdRate, getPrevYearEndDate, getLocalCurrencyLabel,
} from '../domain/fx/fxRates.js'

function fmtNum(n, decimals = 2) {
  return Number(n).toLocaleString('bg-BG', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

function fmtDate(dateStr) {
  if (!dateStr) return dateStr
  const [y, m, d] = dateStr.split('-')
  return `${d}.${m}.${y}`
}

export default function PriorYearApproxWarning({ rows, taxYear = 2025 }) {
  if (!rows || rows.length === 0) return null

  const lcl             = getLocalCurrencyLabel(taxYear)
  const prevYearEndDate = getPrevYearEndDate(taxYear)
  const prevRate        = findUsdRate(prevYearEndDate)
  const prevYearLabel   = String(taxYear - 1)

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
            Приблизителна цена на придобиване в {lcl} — позиции от предходна година
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.7, display: 'block' }}>
            За посочените по-долу сделки не са открити данни за покупка в текущата отчетна година.
            Цената на придобиване в {lcl} е изчислена по курса на БНБ към края на {prevYearLabel} г.
            ({fmtDate(prevYearEndDate)}
            {prevRate != null ? ` — 1 USD = ${fmtNum(prevRate, 4)} ${lcl}` : ''}).
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
              {' — продажба на '}<strong>{r.quantityRaw} бр.</strong>
              {' @ '}{r.priceRaw} {r.currency}
              {' на '}{fmtDate(r.date)}
              {r.costBasis != null && (
                <>
                  {' · цена на придобиване: '}
                  <strong>{fmtNum(r.costBasis, 2)} {r.currency}</strong>
                  {r.costBasisBGN != null && (
                    <> {' ≈ '}<strong>{fmtNum(r.costBasisBGN, 2)} {lcl}</strong> <em>(приблизително)</em></>
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
