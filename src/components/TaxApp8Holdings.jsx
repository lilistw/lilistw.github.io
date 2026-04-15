import { TaxFormSection } from './TaxFormSection.jsx'
import DataTable from './DataTable.jsx'

export default function TaxApp8Holdings({ data }) {
  if (!data || data.rows.length === 0) return null
  return (
    <TaxFormSection
      title="Приложение №8 – Част I"
      subtitle="Притежавани акции и дялове в чуждестранни дружества към 31.12"
    >
      <DataTable data={data} countLabel="позиции" embedded />
    </TaxFormSection>
  )
}
