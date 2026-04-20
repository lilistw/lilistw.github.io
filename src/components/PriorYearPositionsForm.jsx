import { useTranslation } from 'react-i18next'
import { alpha } from '@mui/material/styles'
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Typography,
} from '@mui/material'
import { InfoOutlined } from '@mui/icons-material'
import {
  findUsdRate, getPrevYearEndDate, getLocalCurrencyLabel,
} from '../domain/fx/fxRates.js'

function fmtNum(n, decimals = 2) {
  if (n == null) return '—'
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

/**
 * Controlled form showing inferred prior-year positions.
 * No confirm button — Изчисли (in App) reads the current values directly.
 *
 * Props:
 *   positions       – array of editable position objects (from App.jsx state)
 *   onPositionChange(i, field, value) – called on every edit
 *   taxYear         – current tax year (determines currency label and prev-year date)
 */
export default function PriorYearPositionsForm({ positions, onPositionChange, taxYear = 2025 }) {
  const { t } = useTranslation()
  const lcl             = getLocalCurrencyLabel(taxYear)
  const prevYearEndDate = getPrevYearEndDate(taxYear)
  const prevRate        = findUsdRate(prevYearEndDate)
  const prevYearLabel   = String(taxYear - 1)

  const rateInfo = prevRate != null
    ? t('priorYearForm.rateInfo', { rate: fmtNum(prevRate, 4), lcl })
    : ''

  return (
    <Box sx={{ mt: 2, mb: 1 }}>
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
        {/* Header */}
        <Box sx={{
          px: 2, py: 1.5,
          borderBottom: '1px solid', borderColor: 'divider',
          bgcolor: (theme) => theme.palette.mode === 'dark'
            ? alpha(theme.palette.warning.main, 0.10)
            : '#FFF8E1',
          display: 'flex', alignItems: 'flex-start', gap: 1.5,
        }}>
          <InfoOutlined sx={{ color: 'warning.main', mt: 0.15, flexShrink: 0 }} />
          <Box>
            <Typography variant="subtitle2" fontWeight={700} color="warning.dark" gutterBottom>
              {t('priorYearForm.title', { prevYearLabel })}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.7, display: 'block' }}>
              {t('priorYearForm.bodyLine1', { lcl, prevYearLabel, prevYearEndDate: fmtDate(prevYearEndDate), rateInfo })}{' '}
              <strong>{t('priorYearForm.calculateButton')}</strong>.
            </Typography>
          </Box>
        </Box>

        {/* Table */}
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>{t('priorYearForm.colSymbol')}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{t('priorYearForm.colCurrency')}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>{t('priorYearForm.colQty')}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>{t('priorYearForm.colCostCurrency')}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, minWidth: 160 }}>{t('priorYearForm.colCostLocal', { lcl })}</TableCell>
                <TableCell sx={{ fontWeight: 700, minWidth: 140 }}>{t('priorYearForm.colLastBuyDate')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {positions.map((p, i) => (
                <TableRow key={p.symbol} hover>
                  <TableCell sx={{ fontWeight: 700 }}>{p.symbol}</TableCell>
                  <TableCell>{p.currency}</TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'monospace' }}>
                    {fmtNum(p.qty, 0)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'monospace' }}>
                    {fmtNum(p.costUSD, 2)}
                  </TableCell>
                  <TableCell align="right">
                    <TextField
                      size="small"
                      variant="standard"
                      slotProps={{
                       input: {style: { textAlign: 'right', fontFamily: 'monospace', width: 120 }}
                      }}
                      value={p.costLclInput}
                      onChange={e => onPositionChange(i, 'costLclInput', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      variant="standard"
                      type="date"
                      slotProps={{
                        input: {
                          style: {
                            fontFamily: 'monospace',
                          },
                        },
                      }}
                      value={p.lastBuyDateInput}
                      onChange={e => onPositionChange(i, 'lastBuyDateInput', e.target.value)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  )
}
