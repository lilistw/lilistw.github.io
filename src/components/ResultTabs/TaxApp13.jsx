import { useTranslation } from 'react-i18next'
import { TaxFormSection, TaxRow } from './TaxFormSection.jsx'
import { fmt } from '../../utils/fmt.js'

export default function TaxApp13({ summary, localCurrencyLabel = 'лв' }) {
  const { t } = useTranslation()
  if (!summary || summary.totalProceedsBGN === 0) return null
  const lcl = localCurrencyLabel
  return (
    <TaxFormSection
      title={t('taxApp13.title')}
      subtitle={t('taxApp13.subtitle')}
    >
      <TaxRow label={t('taxApp13.grossIncome', { lcl })} value={fmt(summary.totalProceedsBGN)} />
      <TaxRow label={t('taxApp13.acquisitionCost', { lcl })}  value={fmt(summary.totalCostBasisBGN)} />
    </TaxFormSection>
  )
}
