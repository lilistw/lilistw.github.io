import { TaxFormSection, TaxRow } from './TaxFormSection.jsx'
import { fmt } from '../utils/fmt.js'

export default function TaxApp5({ summary }) {
  if (!summary || summary.totalProceeds === 0) return null
  return (
    <TaxFormSection
      title="Приложение №5 – Таблица 2"
      subtitle="Доходи от прехвърляне на финансови активи (акции, ETF извън ЕС и др.)"
    >
      <TaxRow label="Код" value="508" />
      <TaxRow label="Общ размер на продажните цени"            value={fmt(summary.totalProceeds)} />
      <TaxRow label="Общ размер на цените на придобиване"      value={fmt(summary.totalCostBasis)} />
      <TaxRow label="Реализирани печалби"  value={fmt(summary.profits)} color="success.main" />
      <TaxRow label="Реализирани загуби"   value={fmt(summary.losses)}  color="error.main" />
    </TaxFormSection>
  )
}
