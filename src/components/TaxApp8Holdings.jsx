import { Box, Typography } from '@mui/material'
import { ReceiptLongOutlined } from '@mui/icons-material'
import DataTable from './DataTable.jsx'

const COLUMNS_WITHOUT_TYPE = (columns) =>
  columns.filter(c => c.key !== 'type')

function addRowNumbers(rows) {
  return rows.map((r, i) => ({ '#': i + 1, ...r }))
}

const NUM_COL = { key: '#', label: '#', align: 'right', mono: true, decimals: 0 }

function HoldingsSubTable({ label, data, type }) {
  const rows = data.rows.filter(r => r.type === type)
  if (rows.length === 0) return null
  const columns = [NUM_COL, ...COLUMNS_WITHOUT_TYPE(data.columns)]
  return (
    <DataTable title={label} data={{ columns, rows: addRowNumbers(rows) }} countLabel="позиции" embedded sx={{ mb: 2 }} />
  )
}

export default function TaxApp8Holdings({ data }) {
  if (!data || data.rows.length === 0) return null
  return (
    <Box>
      <Box sx={{
        display: 'flex', alignItems: 'flex-start', gap: 1.5,
        p: 2, mb: 2,
        bgcolor: '#FFFBEB',
        border: '1px solid',
        borderColor: '#FCD34D',
        borderRadius: 2,
      }}>
        <ReceiptLongOutlined sx={{ fontSize: 20, color: 'warning.main', mt: 0.1, flexShrink: 0 }} />
        <Box>
          <Typography variant="subtitle2" fontWeight={700} color="warning.dark" gutterBottom>
            Приложение №8 – Част I Притежавани акции и дялове в чуждестранни дружества към 31.12
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
            Съгласно <strong>чл. 50, ал. 1, т. 2 ЗДДФЛ</strong> всички чуждестранни акции и дялове, притежавани
            към 31 декември, <strong>трябва да се декларират</strong> независимо дали е реализиран доход.
            Вписват се в Приложение №8, Част I — по един ред за всяка позиция.
            Данните се базират на отворените позиции от IBKR към края на годината.
          </Typography>
        </Box>
      </Box>
      <HoldingsSubTable label="Акции" data={data} type="Акции" />
      <HoldingsSubTable label="Дялове" data={data} type="Дялове" />
    </Box>
  )
}
