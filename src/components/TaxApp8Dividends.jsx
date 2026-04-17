import { Box, Typography } from '@mui/material'
import { InfoOutlined } from '@mui/icons-material'
import { TaxFormSection } from './TaxFormSection.jsx'
import DataTable from './DataTable.jsx'

export default function TaxApp8Dividends({ data }) {
  if (!data || data.rows.length === 0) return null
  return (
    <TaxFormSection
      title="Приложение №8 – Част III"
      subtitle="Определяне на дължимия окончателен данък по чл. 38 от ЗДДФЛ за доходи от източници в чужбина на местни физически лица"
    >
      <Box sx={{ display: 'flex', gap: 1, mb: 2, p: 1.5, bgcolor: '#EFF6FF', borderRadius: 1.5 }}>
        <InfoOutlined sx={{ fontSize: 15, color: 'primary.main', mt: 0.15, flexShrink: 0 }} />
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.6 }}>
          Дивидентите се облагат с <strong>окончателен данък 5%</strong> върху брутния размер.
          Ако дружеството е удържало данък в чужбина, той се вписва в колона{' '}
          <em>Удържан данък в чужбина</em> и се приспада от дължимия български данък (<strong>данъчен кредит</strong>).
          Попълнете по един ред за всяка страна-източник в Приложение №8, Част III.
        </Typography>
      </Box>
      <DataTable title="Дължим данък за дивиденти от чужбина" data={data} countLabel="записа" embedded />
    </TaxFormSection>
  )
}
