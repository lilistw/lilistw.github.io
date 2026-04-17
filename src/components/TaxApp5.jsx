import { TaxFormSection, TaxRow } from './TaxFormSection.jsx'
import { fmt } from '../utils/fmt.js'

export default function TaxApp5({ summary }) {
  if (!summary) return null
  return (
    <TaxFormSection
      title="Приложение №5 – Таблица 2"
      subtitle="Доходи от прехвърляне на финансови активи (акции, ETF извън ЕС и др.)"
    >
      <TaxRow label="Код" value="508" />
      <TaxRow label="Общ размер на продажните цени при продажба или замяна на финансови активи (лв)"
        value={fmt(summary.totalProceedsBGN)} />
      <TaxRow label="Общ размер на цените на придобиване (лв)"
        value={fmt(summary.totalCostBasisBGN)} />
      <TaxRow label="Реализирани печалби (лв)"
        value={fmt(summary.profits)} color="success.main" />
      <TaxRow label="Реализирани загуби (лв)"
        value={fmt(summary.losses)} color="error.main" />
    </TaxFormSection>
  )
}
