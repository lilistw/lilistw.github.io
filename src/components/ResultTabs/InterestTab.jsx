import { useTranslation, Trans } from 'react-i18next'
import { Box, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { ReceiptLongOutlined } from '@mui/icons-material'
import DataTable from '../DataTable'

export default function InterestTab({ result }) {
  const { t } = useTranslation()

  const { localCurrencyLabel, localCurrencyCode } = result

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
            <Trans
              i18nKey="app.interest.body"
              values={{ localCurrencyLabel, localCurrencyCode }}
              components={{
                app6: <strong />,
                code: <strong />,
                em: <em />,
              }}
            />
          </Typography>
        </Box>
      </Box>

      <DataTable
        title={t('app.tabs.interest')}
        data={result.interest}
        countLabel={t('app.countLabel.payments')}
      />
    </>
  )
}