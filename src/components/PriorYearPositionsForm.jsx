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
  const lcl             = getLocalCurrencyLabel(taxYear)
  const prevYearEndDate = getPrevYearEndDate(taxYear)
  const prevRate        = findUsdRate(prevYearEndDate)
  const prevYearLabel   = String(taxYear - 1)

  return (
    <Box sx={{ mt: 2, mb: 1 }}>
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
        {/* Header */}
        <Box sx={{
          px: 2, py: 1.5,
          borderBottom: '1px solid', borderColor: 'divider',
          bgcolor: '#FFF8E1',
          display: 'flex', alignItems: 'flex-start', gap: 1.5,
        }}>
          <InfoOutlined sx={{ color: 'warning.main', mt: 0.15, flexShrink: 0 }} />
          <Box>
            <Typography variant="subtitle2" fontWeight={700} color="warning.dark" gutterBottom>
              Позиции от предходна година ({prevYearLabel}) — прегледайте и коригирайте при нужда
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.7, display: 'block' }}>
              Установени са позиции, придобити преди текущата данъчна година.
              Цената на придобиване в {lcl} е изчислена по курса на БНБ към края на {prevYearLabel}&nbsp;г.
              ({fmtDate(prevYearEndDate)}
              {prevRate != null ? ` — 1\u00a0USD\u00a0=\u00a0${fmtNum(prevRate, 4)}\u00a0${lcl}` : ''}).
              {' '}Можете да коригирате стойностите спрямо действителния курс на придобиване и
              датата на последна покупка, след което натиснете <strong>Изчисли</strong>.
            </Typography>
          </Box>
        </Box>

        {/* Table */}
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Символ</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Валута</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Брой</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Цена придобиване (вал)</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, minWidth: 160 }}>Цена придобиване ({lcl})</TableCell>
                <TableCell sx={{ fontWeight: 700, minWidth: 140 }}>Дата последна покупка</TableCell>
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
                      inputProps={{ style: { textAlign: 'right', fontFamily: 'monospace', width: 120 } }}
                      value={p.costBGNInput}
                      onChange={e => onPositionChange(i, 'costBGNInput', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      variant="standard"
                      type="date"
                      inputProps={{ style: { fontFamily: 'monospace' } }}
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
