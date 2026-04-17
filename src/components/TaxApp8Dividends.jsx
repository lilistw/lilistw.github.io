import { Box, Typography } from '@mui/material'
import { ReceiptLongOutlined } from '@mui/icons-material'
import DataTable from './DataTable.jsx'

export default function TaxApp8Dividends({ data }) {
  if (!data || data.rows.length === 0) return null
  return (
    <Box>
      <Box sx={{
        display: 'flex', alignItems: 'flex-start', gap: 1.5,
        p: 2, mb: 2,
        bgcolor: '#FFFBEB',
        border: '1px solid',
        borderColor: '#FCD34D',
        borderRadius: 2,
      }}>
        <ReceiptLongOutlined sx={{ fontSize: 20, color: 'warning.main', mt: 0.1, flexShrink: 0 }} />
        <Box>
          <Typography variant="subtitle2" fontWeight={700} color="warning.dark" gutterBottom>
            Приложение №8 – Част III Дивиденти от чужбина
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
            Дивидентите се облагат с <strong>окончателен данък 5%</strong> върху брутния размер.
            Ако дружеството е удържало данък в чужбина, той се вписва в колона{' '}
            <em>Удържан данък в чужбина</em> и се приспада от дължимия български данък (<strong>данъчен кредит</strong>).
          </Typography>
        </Box>
        
      </Box>
      <DataTable title="Дължим данък за дивиденти от чужбина" data={data} countLabel="записа" embedded />
    </Box>
  )
}
