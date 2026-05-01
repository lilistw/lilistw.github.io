import { t } from '../../localization/i18n.js'
import { Box, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { ReceiptLongOutlined } from '@mui/icons-material'
import DataTable from './DataTable'
import { InterestPresenter } from '../../presentation/InterestPresenter.js'

export default function InterestTab({ result }) {
  const { localCurrencyLabel, localCurrencyCode } = result

  const interestTable = new InterestPresenter({
    lcl: localCurrencyLabel,
  }).buildTable(result.interest)

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1.5,
          p: 2,
          mb: 2,
          bgcolor: (theme) =>
            theme.palette.mode === 'dark'
              ? alpha(theme.palette.warning.main, 0.10)
              : '#FFFBEB',
          border: '1px solid',
          borderColor: (theme) =>
            theme.palette.mode === 'dark'
              ? alpha(theme.palette.warning.main, 0.25)
              : '#FCD34D',
          borderRadius: 2,
        }}
      >
        <ReceiptLongOutlined
          sx={{ fontSize: 20, color: 'warning.main', mt: 0.1, flexShrink: 0 }}
        />

        <Box>
          <Typography
            variant="subtitle2"
            fontWeight={700}
            color="warning.dark"
            gutterBottom
          >
            {t('app.interest.title')}
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ lineHeight: 1.6 }}
          >
            {t('app.interest.bodyPart1')} <strong>{t('app.interest.bodyApp6')}</strong>{t('app.interest.bodyPart2')} <strong>{t('app.interest.bodyCode')}</strong>{t('app.interest.bodyPart3')} <em>{t('app.interest.bodyField')}</em>{t('app.interest.bodyPart4', { localCurrencyLabel, localCurrencyCode })}
          </Typography>
        </Box>
      </Box>

      <DataTable
        title={t('app.tabs.interest')}
        columns={interestTable.columns}
        rows={interestTable.rows}
        countLabel={t('app.countLabel.payments')}
      />
    </>
  )
}