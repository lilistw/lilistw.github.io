import { Box, Paper, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { ArticleOutlined } from '@mui/icons-material'
import { fmt } from '../../presentation/fmt.js'

export function TaxFormSection({ title, subtitle, rows }) {
  return (
    <Paper
      variant="outlined"
      sx={{ mb: 3, borderRadius: 2, borderColor: 'warning.light', overflow: 'hidden' }}
    >
      <Box
        sx={{
          px: 2, py: 1.5,
          bgcolor: (theme) => theme.palette.mode === 'dark'
            ? alpha(theme.palette.warning.main, 0.10)
            : 'rgba(217,119,6,0.06)',
          borderBottom: '1px solid',
          borderColor: 'warning.light',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <ArticleOutlined sx={{ fontSize: 18, color: 'warning.main', flexShrink: 0 }} />
        <Box>
          <Typography variant="subtitle2" fontWeight={700} color="warning.dark" sx={{ lineHeight: 1.3 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
          )}
        </Box>
      </Box>
      <Box sx={{ px: 2, pt: 1, pb: 1.5 }}>{
        rows?.map((r, i) => (
          <TaxRow
            key={i}
            label={r.label}
            value={fmt(r.value)}
            color={r.color}
          />
        ))}</Box>
    </Paper>
  )
}

export function TaxRow({ label, value, color }) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        py: 0.75,
        borderBottom: '1px solid',
        borderColor: 'divider',
        '&:last-child': { borderBottom: 'none' },
      }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>{label}</Typography>
      <Typography
        variant="body2"
        fontWeight={color ? 700 : 500}
        color={color || 'text.primary'}
        sx={{ fontFamily: 'monospace', flexShrink: 0 }}
      >
        {value}
      </Typography>
    </Box>
  )
}
