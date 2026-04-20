import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Box, Button, Checkbox, Chip, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Tooltip, Typography,
} from '@mui/material'
import { Check, ContentCopyOutlined, ExpandLess, ExpandMore } from '@mui/icons-material'

const PREVIEW_ROWS = 5

function fmt(n, decimals = 2) {
  return Number(n).toLocaleString('bg-BG', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

function CellContent({ col, value, tooltipText }) {
  if (col.chip && value) {
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

  if (value == null && col.nullAs !== undefined) {
    return (
      <Box component="span" sx={{ fontFamily: col.mono ? 'monospace' : 'inherit', color: 'text.secondary' }}>
        {col.nullAs}
      </Box>
    )
  }

  const displayValue = isNumeric && col.decimals !== undefined
    ? fmt(Number(value), decimals)
    : value

  const content = (
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

  if (tooltipText) {
    return (
      <Tooltip title={tooltipText} placement="top" arrow>
        <Box component="span" sx={{ cursor: 'help', borderBottom: '1px dotted', borderColor: 'text.disabled' }}>
          {content}
        </Box>
      </Tooltip>
    )
  }

  return content
}

function cellText(col, value) {
  if (value == null) return ''
  const decimals = col.decimals ?? 2
  if ((col.pnl || col.decimals !== undefined) && typeof value === 'number')
    return value.toFixed(decimals)
  return String(value)
}

function buildTsv(columns, rows) {
  const header = columns.map(c => c.label).join('\t')
  const body   = rows.map(row => columns.map(col => cellText(col, row[col.key])).join('\t'))
  return [header, ...body].join('\r\n')
}

function CopyExcelButton({ columns, rows }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  async function handleCopy() {
    await navigator.clipboard.writeText(buildTsv(columns, rows))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <Button
      size="small"
      variant="text"
      onClick={handleCopy}
      color={copied ? 'success' : 'primary'}
      startIcon={copied ? <Check fontSize="small" /> : <ContentCopyOutlined fontSize="small" />}
      sx={{ fontWeight: 400, fontSize: 12, textDecoration: 'underline', textUnderlineOffset: 3,
            '&:hover': { textDecoration: 'underline' }, minWidth: 0, px: 0.5 }}
    >
      {copied ? t('dataTable.copied') : t('dataTable.copyToExcel')}
    </Button>
  )
}

export default function DataTable({ title, data, countLabel, hint, embedded = false, sx, onCheckChange }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const { columns, rows } = data
  const dataRows  = rows.filter(r => !r._total)
  const totalRows = rows.filter(r =>  r._total)
  const visible = expanded ? dataRows : dataRows.slice(0, PREVIEW_ROWS)
  const hidden = dataRows.length - PREVIEW_ROWS

  // Internal checkbox state — used only when onCheckChange is not provided
  const checkCols = columns.filter(c => c.editable === 'checkbox')
  const [checkState, setCheckState] = useState(() =>
    Object.fromEntries(checkCols.map(col => [col.key, rows.map(r => r[col.key] ?? true)]))
  )
  const handleCheck = (colKey, rowIdx) =>
    setCheckState(prev => ({
      ...prev,
      [colKey]: prev[colKey].map((v, i) => i === rowIdx ? !v : v),
    }))

  return (
    <Box sx={{ mb: embedded ? 0 : 3, ...sx }}>
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
        {/* Card header — always shown */}
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1,
          px: 2, py: 1,
          borderBottom: '1px solid', borderColor: 'divider',
          backgroundColor: 'grey.50',
        }}>
          {title && (
            <>
              <Typography variant="subtitle2" fontWeight={700}>{title}</Typography>
              <Chip label={dataRows.length} size="small" color="primary" />
            </>
          )}
          <Box sx={{ ml: 'auto' }}>
            <CopyExcelButton columns={columns} rows={dataRows} />
          </Box>
        </Box>

        {/* Info text below the table header */}
        {hint}

        <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              {columns.map(col => (
                <TableCell key={col.key} align={col.align ?? 'left'}
                  sx={col.maxWidth ? { maxWidth: col.maxWidth, width: col.maxWidth } : undefined}>
                  {col.shortLabel
                    ? <Tooltip title={col.label} placement="top" arrow><span style={{ cursor: 'help', borderBottom: '1px dotted' }}>{col.shortLabel}</span></Tooltip>
                    : col.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {[...visible, ...totalRows].map((row, i) => (
              <TableRow
                key={i}
                hover={!row._total}
                sx={row._total ? {
                  backgroundColor: 'grey.50',
                  '& td': { fontWeight: 700, borderTop: '2px solid', borderTopColor: 'divider' },
                } : undefined}
              >
                {columns.map(col => (
                  <TableCell key={col.key} align={col.align ?? 'left'}>
                    {col.editable === 'checkbox' && !row._total
                      ? onCheckChange
                        ? (row[col.key] !== null &&
                          <Checkbox size="small" sx={{ p: 0 }}
                            checked={row[col.key] === true}
                            disabled={row[col.key] === null}
                            onChange={() => onCheckChange(i)}
                          />)
                        : <Checkbox size="small" sx={{ p: 0 }}
                            checked={checkState[col.key]?.[i] ?? true}
                            onChange={() => handleCheck(col.key, i)}
                          />
                      : <CellContent col={col} value={row[col.key]} tooltipText={col.tooltip ? row[col.tooltip] : undefined} />
                    }
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </TableContainer>

        {hidden > 0 && (
          <Box sx={{ textAlign: 'center', py: 0.5, borderTop: '1px solid', borderColor: 'divider' }}>
            <Button
              size="small"
              variant="text"
              onClick={() => setExpanded(e => !e)}
              endIcon={expanded ? <ExpandLess /> : <ExpandMore />}
            >
              {expanded ? t('dataTable.hide') : t('dataTable.showAll', { hidden, countLabel })}
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  )
}
