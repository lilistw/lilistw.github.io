import { t } from '../localization/i18n.js'
import { Box, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { WarningAmberOutlined } from '@mui/icons-material'
import {
  findUsdRate, getPrevYearEndDate, getLocalCurrencyLabel,
} from '../core/domain/fx/fxRates.js'

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

  const lcl             = t(`currencyLabels.${getLocalCurrencyLabel(taxYear).toLowerCase()}`)
  const prevYearEndDate = getPrevYearEndDate(taxYear)
  const prevRate        = findUsdRate(prevYearEndDate, taxYear)
  const prevYearLabel   = String(taxYear - 1)

  const rateInfo = prevRate != null
    ? t('priorYearWarning.rateInfo', { rate: fmtNum(prevRate, 4), lcl })
    : ''

  return (
    <Box sx={{
      mt: 2, mb: 1,
      p: 2,
      bgcolor: (theme) => theme.palette.mode === 'dark'
        ? alpha(theme.palette.warning.main, 0.10)
        : '#FFFBEB',
      border: '1px solid',
      borderColor: (theme) => theme.palette.mode === 'dark'
        ? alpha(theme.palette.warning.main, 0.25)
        : 'warning.light',
      borderRadius: 2,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1 }}>
        <WarningAmberOutlined sx={{ color: 'warning.main', mt: 0.15, flexShrink: 0 }} />
        <Box>
          <Typography variant="subtitle2" fontWeight={700} color="warning.dark" gutterBottom>
            {t('priorYearWarning.title', { lcl })}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.7, display: 'block' }}>
            {t('priorYearWarning.bodyLine1', { lcl, prevYearLabel, prevYearEndDate: fmtDate(prevYearEndDate), rateInfo })}
          </Typography>
        </Box>
      </Box>

      <Box component="ul" sx={{ m: 0, pl: 3.5 }}>
        {rows.map((r, i) => (
          <Box component="li" key={i} sx={{ mb: 0.5 }}>
            <Typography variant="caption" color="text.primary" sx={{ lineHeight: 1.8 }}>
              <strong>{r.symbol}</strong>
              {' \u2014 '}{t('priorYearWarning.salePart')} <strong>{r.quantityRaw} {t('priorYearWarning.units')}</strong>
              {' '}{t('priorYearWarning.at')}{' '}{r.priceRaw} {r.currency}
              {' '}{t('priorYearWarning.on')}{' '}{fmtDate(r.date)}
              {r.costBasis != null && (
                <>
                  {' \u00b7 '}{t('priorYearWarning.acquisitionCost')}{' '}
                  <strong>{fmtNum(r.costBasis, 2)} {r.currency}</strong>
                  {r.costBasisLcl != null && (
                    <> {' \u2248 '}<strong>{fmtNum(r.costBasisLcl, 2)} {lcl}</strong> <em>{t('priorYearWarning.approx')}</em></>
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
