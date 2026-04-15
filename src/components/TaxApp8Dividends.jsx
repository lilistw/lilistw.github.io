import { TaxFormSection } from './TaxFormSection.jsx'
import DataTable from './DataTable.jsx'

export default function TaxApp8Dividends({ data }) {
  if (!data || data.rows.length === 0) return null
  return (
    <TaxFormSection
      title="Приложение №8 – Част III"
      subtitle="Дължим окончателен данък (чл. 38 ЗДДФЛ) за дивиденти от чужбина"
    >
      <DataTable data={data} countLabel="записа" embedded />
    </TaxFormSection>
  )
}
