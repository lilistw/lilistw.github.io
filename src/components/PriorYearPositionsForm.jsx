import { useState } from 'react'
import {
  Box, Button, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Typography,
} from '@mui/material'
import { InfoOutlined } from '@mui/icons-material'
import { PREV_YEAR_END_DATE, PREV_YEAR_DEFAULT_ACQ_DATE, findUsdRate } from '../domain/fx/fxRates.js'

const PREV_RATE_USD = findUsdRate(PREV_YEAR_END_DATE)

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
 * Form shown after both files are loaded, before the user can click Изчисли.
 * Lets the user review and correct the inferred prior-year cost basis in BGN
 * and the default acquisition date for each prior-year position.
 */
export default function PriorYearPositionsForm({ positions, onConfirm }) {
  const [edited, setEdited] = useState(() =>
    positions.map(p => ({
      ...p,
      costBGNInput: p.costBGN != null ? String(Number(p.costBGN).toFixed(2)) : '',
      lastBuyDateInput: p.lastBuyDate ?? PREV_YEAR_DEFAULT_ACQ_DATE,
    }))
  )

  function handleChange(i, field, value) {
    setEdited(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p))
  }

  function handleConfirm() {
    const confirmed = edited.map(p => ({
      symbol:      p.symbol,
      currency:    p.currency,
      qty:         p.qty,
      costUSD:     p.costUSD,
      costBGN:     parseFloat(p.costBGNInput.replace(',', '.')) || 0,
      lastBuyDate: p.lastBuyDateInput || PREV_YEAR_DEFAULT_ACQ_DATE,
    }))
    onConfirm(confirmed)
  }

  const prevYearLabel = PREV_YEAR_END_DATE.slice(0, 4)

  return (
    <Box sx={{ mt: 2, mb: 2 }}>
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
              Потвърдете позициите от предходна година ({prevYearLabel})
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.7, display: 'block' }}>
              Установени са позиции, придобити преди текущата данъчна година.
              Цената на придобиване в лева е изчислена по курса на БНБ към края на {prevYearLabel}&nbsp;г.
              ({fmtDate(PREV_YEAR_END_DATE)}
              {PREV_RATE_USD != null ? ` — 1&nbsp;USD&nbsp;=&nbsp;${fmtNum(PREV_RATE_USD, 4)}&nbsp;лв` : ''}).
              {' '}Можете да коригирате стойностите спрямо действителния курс на придобиване и да
              промените датата на последна покупка.
              {' '}След натискане на <strong>Потвърди</strong> бутонът <strong>Изчисли</strong> ще се активира.
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
                <TableCell align="right" sx={{ fontWeight: 700, minWidth: 160 }}>Цена придобиване (лв)</TableCell>
                <TableCell sx={{ fontWeight: 700, minWidth: 140 }}>Дата последна покупка</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {edited.map((p, i) => (
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
                      onChange={e => handleChange(i, 'costBGNInput', e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      variant="standard"
                      type="date"
                      inputProps={{ style: { fontFamily: 'monospace' } }}
                      value={p.lastBuyDateInput}
                      onChange={e => handleChange(i, 'lastBuyDateInput', e.target.value)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Confirm button */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 2, py: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button variant="contained" color="warning" onClick={handleConfirm}>
            Потвърди
          </Button>
        </Box>
      </Paper>
    </Box>
  )
}
