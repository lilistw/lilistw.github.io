import { TaxFormSection, TaxRow } from './TaxFormSection.jsx'
import { fmt } from '../utils/fmt.js'

export default function TaxApp13({ summary }) {
  if (!summary || summary.totalProceeds === 0) return null
  return (
    <TaxFormSection
      title="Приложение №13 – Част II"
      subtitle="Необлагаеми доходи от продажба на дялове от ETF от Европейски съюз"
    >
      <TaxRow label="Код" value="508" />
      <TaxRow label="Брутен размер на дохода (продажни цени)" value={fmt(summary.totalProceeds)} />
      <TaxRow label="Цена на придобиване"                     value={fmt(summary.totalCostBasis)} />
    </TaxFormSection>
  )
}
