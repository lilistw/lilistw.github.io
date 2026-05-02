import { t } from '../../localization/i18n.js'
import { Box, Typography } from '@mui/material'
import { InfoOutlined } from '@mui/icons-material'
import { TaxFormSection, TaxRow } from './TaxFormSection.jsx'
import { TradeSummaryPresenter } from '../presentation/TradeSummaryPresenter.js'


export default function TaxSummary({ taxSummary, localCurrencyLabel = 'BGN' }) {
  const lcl = t(`currencyLabels.${localCurrencyLabel.toLowerCase()}`)
  const presenter = new TradeSummaryPresenter({
    t,
    lcl,
  })
  return (
    <>
      <TaxFormSection {...presenter.buildTaxable(taxSummary.sumTaxable)} />
      <TaxFormSection {...presenter.buildExempt(taxSummary.sumExempt)} />
    </>
  )
}
