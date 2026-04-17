import { Box, Typography } from '@mui/material'
import { InfoOutlined } from '@mui/icons-material'
import { TaxFormSection } from './TaxFormSection.jsx'
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
    <TaxFormSection
      title="Приложение №8 – Част I"
      subtitle="Притежавани акции и дялове в чуждестранни дружества към 31.12"
    >
      <Box sx={{ display: 'flex', gap: 1, mb: 2, p: 1.5, bgcolor: '#EFF6FF', borderRadius: 1.5 }}>
        <InfoOutlined sx={{ fontSize: 15, color: 'primary.main', mt: 0.15, flexShrink: 0 }} />
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
          Съгласно <strong>чл. 50, ал. 1, т. 2 ЗДДФЛ</strong> всички чуждестранни акции и дялове, притежавани
          към 31 декември, <strong>трябва да се декларират</strong> независимо дали е реализиран доход.
          Вписват се в Приложение №8, Част I — по един ред за всяка позиция.
          Данните се базират на отворените позиции от IBKR към края на годината.
        </Typography>
      </Box>
      <HoldingsSubTable label="Акции" data={data} type="Акции" />
      <HoldingsSubTable label="Дялове" data={data} type="Дялове" />
    </TaxFormSection>
  )
}
