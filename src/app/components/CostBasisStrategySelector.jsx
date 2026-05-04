import { t } from '../localization/i18n.js'
import { useLocale } from '../hooks/useLocale.js'
import { alpha } from '@mui/material/styles'
import {
  Box, FormControl, FormControlLabel, FormLabel,
  Radio, RadioGroup, Typography,
} from '@mui/material'
import { InfoOutlined } from '@mui/icons-material'

export default function CostBasisStrategySelector({ value, onChange }) {
  useLocale()

  return (
    <Box sx={{ mt: 1, mb: 1 }}>
      <Box sx={{
        px: 2, py: 1.5,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: (theme) => theme.palette.mode === 'dark'
          ? alpha(theme.palette.info.main, 0.07)
          : alpha(theme.palette.info.main, 0.05),
      }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.5 }}>
          <InfoOutlined sx={{ color: 'info.main', mt: 0.15, flexShrink: 0, fontSize: 18 }} />
          <Typography variant="caption" color="text.secondary">
            {t('costBasisStrategy.defaultWarning')}
          </Typography>
        </Box>

        <FormControl>
          <FormLabel sx={{ mb: 0.5 }}>
            <Typography variant="subtitle2" fontWeight={700}>
              {t('costBasisStrategy.label')}
            </Typography>
          </FormLabel>
          <RadioGroup value={value} onChange={e => onChange(e.target.value)}>
            <FormControlLabel
              value="ibkr"
              control={<Radio size="small" />}
              label={
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    {t('costBasisStrategy.ibkr')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t('costBasisStrategy.ibkrDesc')}
                  </Typography>
                </Box>
              }
            />
            <FormControlLabel
              value="weighted-average"
              control={<Radio size="small" />}
              label={
                <Box>
                  <Typography variant="body2" fontWeight={600}>
                    {t('costBasisStrategy.weightedAverage')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t('costBasisStrategy.weightedAverageDesc')}
                  </Typography>
                </Box>
              }
            />
          </RadioGroup>
        </FormControl>
      </Box>
    </Box>
  )
}
