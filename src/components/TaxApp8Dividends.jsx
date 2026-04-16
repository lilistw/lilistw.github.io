import { TaxFormSection } from './TaxFormSection.jsx'
import DataTable from './DataTable.jsx'

export default function TaxApp8Dividends({ data }) {
  if (!data || data.rows.length === 0) return null
  return (
    <TaxFormSection
      title="Приложение №8 – Част III"
      subtitle="Определяне на дължимия окончателен данък по чл. 38 от ЗДДФЛ за доходи от източници в чужбина на местни физически лица"
    >
      <DataTable title="Дължим данък за дивиденти от чужбина" data={data} countLabel="записа" embedded />
    </TaxFormSection>
  )
}
