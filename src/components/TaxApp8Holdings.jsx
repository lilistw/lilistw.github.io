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
      <HoldingsSubTable label="Акции" data={data} type="Акции" />
      <HoldingsSubTable label="Дялове" data={data} type="Дялове" />
    </TaxFormSection>
  )
}
