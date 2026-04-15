import { useState } from 'react'
import {
  Box, Button, Chip, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Typography,
} from '@mui/material'
import { FiChevronDown, FiChevronUp } from 'react-icons/fi'

const PREVIEW_ROWS = 5

function fmt(n, decimals = 2) {
  return Number(n).toLocaleString('bg-BG', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

function CellContent({ col, value }) {
  if (col.chip) {
    const color = col.chipColors?.[value] ?? 'default'
    return <Chip label={value} size="small" color={color} sx={{ fontWeight: 700, fontSize: 11 }} />
  }

  const decimals = col.decimals ?? 2
  const isNumeric = typeof value === 'number' || (typeof value === 'string' && !isNaN(Number(value)))

  if (col.pnl) {
    const num = Number(value)
    const display = (col.zeroAs !== undefined && num === 0) || (col.nullAs !== undefined && value === null)
      ? (col.zeroAs ?? col.nullAs)
      : fmt(num, decimals)

    return (
      <Box
        component="span"
        sx={{
          color: num > 0 ? 'success.main' : num < 0 ? 'error.main' : 'text.secondary',
          fontWeight: num !== 0 ? 600 : 400,
          fontFamily: col.mono ? 'monospace' : 'inherit',
        }}
      >
        {display}
      </Box>
    )
  }

  const displayValue = isNumeric && col.decimals !== undefined
    ? fmt(Number(value), decimals)
    : value

  return (
    <Box
      component="span"
      sx={{
        fontFamily: col.mono ? 'monospace' : 'inherit',
        fontWeight: col.bold ? 700 : 'inherit',
      }}
    >
      {displayValue}
    </Box>
  )
}

export default function DataTable({ title, data, countLabel }) {
  const [expanded, setExpanded] = useState(false)
  const { columns, rows } = data
  const visible = expanded ? rows : rows.slice(0, PREVIEW_ROWS)
  const hidden = rows.length - PREVIEW_ROWS

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
        <Chip label={rows.length} size="small" color="primary" />
      </Box>

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {columns.map(col => (
                <TableCell key={col.key} align={col.align ?? 'left'}>
                  {col.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {visible.map((row, i) => (
              <TableRow key={i} hover>
                {columns.map(col => (
                  <TableCell key={col.key} align={col.align ?? 'left'}>
                    <CellContent col={col} value={row[col.key]} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {rows.length > PREVIEW_ROWS && (
        <Box sx={{ mt: 1, textAlign: 'center' }}>
          <Button
            size="small"
            variant="text"
            onClick={() => setExpanded(e => !e)}
            endIcon={expanded ? <FiChevronUp /> : <FiChevronDown />}
          >
            {expanded ? 'Скрий' : `Покажи всички ${hidden} скрити ${countLabel}`}
          </Button>
        </Box>
      )}
    </Box>
  )
}
