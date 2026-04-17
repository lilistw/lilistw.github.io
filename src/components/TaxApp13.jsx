import { TaxFormSection, TaxRow } from './TaxFormSection.jsx'
import { fmt } from '../utils/fmt.js'

export default function TaxApp13({ summary, localCurrencyLabel = 'лв' }) {
  if (!summary || summary.totalProceedsBGN === 0) return null
  const lcl = localCurrencyLabel
  return (
    <TaxFormSection
      title="Приложение №13 – Част II"
      subtitle="Необлагаеми доходи от продажба на дялове от ETF на регулирани пазари в ЕС"
    >
      <TaxRow label="Код" value="508" />
      <TaxRow label={`Брутен размер на дохода (продажни цени) (${lcl})`} value={fmt(summary.totalProceedsBGN)} />
      <TaxRow label={`Цена на придобиване (${lcl})`}                      value={fmt(summary.totalCostBasisBGN)} />
    </TaxFormSection>
  )
}
