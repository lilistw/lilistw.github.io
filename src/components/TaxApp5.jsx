import { useTranslation } from 'react-i18next'
import { Box, Typography } from '@mui/material'
import { InfoOutlined } from '@mui/icons-material'
import { TaxFormSection, TaxRow } from './TaxFormSection.jsx'
import { fmt } from '../utils/fmt.js'

export default function TaxApp5({ summary, localCurrencyLabel = 'лв' }) {
  const { t } = useTranslation()
  if (!summary) return null
  const lcl = localCurrencyLabel
  const netTaxable = summary.profits - summary.losses
  const taxDue     = Math.max(netTaxable, 0) * 0.10
  return (
    <TaxFormSection
      title={t('taxApp5.title')}
      subtitle={t('taxApp5.subtitle')}
    >
      <TaxRow label={t('taxApp5.totalProceeds', { lcl })}
        value={fmt(summary.totalProceedsBGN)} />
      <TaxRow label={t('taxApp5.totalCost', { lcl })}
        value={fmt(summary.totalCostBasisBGN)} />
      <TaxRow label={t('taxApp5.profits', { lcl })}
        value={fmt(summary.profits)} color="success.main" />
      <TaxRow label={t('taxApp5.losses', { lcl })}
        value={fmt(summary.losses)} color="error.main" />
      <TaxRow label={t('taxApp5.netIncome', { lcl })}
        value={fmt(netTaxable)} color={netTaxable >= 0 ? 'success.main' : 'error.main'} />
      <TaxRow label={t('taxApp5.taxDue', { lcl })}
        value={fmt(taxDue)} color="warning.dark" />
      <Box sx={{ display: 'flex', gap: 1, mt: 1.5, p: 1.5, bgcolor: '#EFF6FF', borderRadius: 1.5 }}>
        <InfoOutlined sx={{ fontSize: 15, color: 'primary.main', mt: 0.15, flexShrink: 0 }} />
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
          {t('taxApp5.infoLine1')} <strong>{t('taxApp5.infoFormula')}</strong>
          {t('taxApp5.infoLine2')} <strong>{t('taxApp5.infoLine2Bold')}</strong> {t('taxApp5.infoLine3')}
        </Typography>
      </Box>
    </TaxFormSection>
  )
}
