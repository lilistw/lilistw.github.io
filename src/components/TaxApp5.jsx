import { Box, Typography } from '@mui/material'
import { InfoOutlined } from '@mui/icons-material'
import { TaxFormSection, TaxRow } from './TaxFormSection.jsx'
import { fmt } from '../utils/fmt.js'

export default function TaxApp5({ summary, localCurrencyLabel = 'лв' }) {
  if (!summary) return null
  const lcl = localCurrencyLabel
  const netTaxable = summary.profits - summary.losses
  const taxDue     = Math.max(netTaxable, 0) * 0.10
  return (
    <TaxFormSection
      title="Приложение №5 – Таблица 2"
      subtitle="Доходи от прехвърляне на финансови активи (акции, ETF извън ЕС и др.). Код – 508"
    >
      <TaxRow label={`Общ размер на продажните цени при продажба или замяна на финансови активи (${lcl})`}
        value={fmt(summary.totalProceedsBGN)} />
      <TaxRow label={`Общ размер на цените на придобиване (${lcl})`}
        value={fmt(summary.totalCostBasisBGN)} />
      <TaxRow label={`Реализирани печалби (${lcl})`}
        value={fmt(summary.profits)} color="success.main" />
      <TaxRow label={`Реализирани загуби (${lcl})`}
        value={fmt(summary.losses)} color="error.main" />
      <TaxRow label={`Нетен облагаем доход (печалби − загуби) (${lcl})`}
        value={fmt(netTaxable)} color={netTaxable >= 0 ? 'success.main' : 'error.main'} />
      <TaxRow label={`Дължим данък 10% (${lcl})`}
        value={fmt(taxDue)} color="warning.dark" />
      <Box sx={{ display: 'flex', gap: 1, mt: 1.5, p: 1.5, bgcolor: '#EFF6FF', borderRadius: 1.5 }}>
        <InfoOutlined sx={{ fontSize: 15, color: 'primary.main', mt: 0.15, flexShrink: 0 }} />
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
          Данъкът се изчислява върху нетния облагаем доход: <strong>печалби − загуби × 10%</strong>.
          Ако загубите надвишават печалбите, данъкът е 0. Загубите <strong>не се</strong> пренасят за следващи години.
          Въведете стойностите от таблицата в съответните полета на Приложение №5, Таблица 2, Код 508.
        </Typography>
      </Box>
    </TaxFormSection>
  )
}
