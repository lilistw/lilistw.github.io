// Browser-only: uses navigator.clipboard
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  IconButton,
  Box
} from '@mui/material'
import { t } from '../../localization/i18n.js'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'

function JsonAccordion({ title, text, defaultExpanded = false }) {
  const handleCopy = (e) => {
    e.stopPropagation()
    navigator.clipboard.writeText(text || '')
  }

  return (
    <Accordion defaultExpanded={defaultExpanded} disableGutters>
      <AccordionSummary 
        expandIcon={<ExpandMoreIcon />}
        >
        <Typography sx={{ flexGrow: 1, fontWeight: 600, fontSize: 15, color: 'text.secondary' }}>
          {title}
        </Typography>

        <IconButton size="small" component="span" onClick={handleCopy}>
          <ContentCopyIcon fontSize="inherit" />
        </IconButton>
      </AccordionSummary>

      <AccordionDetails sx={{ p: 0 }}>
        <Box
          component="pre"
          sx={{
            m: 0,
            p: 2,
            fontFamily: 'monospace',
            fontSize: 13,
            lineHeight: 1.6,
            overflow: 'auto',
            maxHeight: '70vh',
            backgroundColor: 'background.default'
          }}
        >
          {text}
        </Box>
      </AccordionDetails>
    </Accordion>
  )
}

export default function DevTab({ inputJsonText, outputJsonText }) {
  return (
    <>
      <JsonAccordion
        title={t('app.dev.inputJson')}
        text={inputJsonText}
        defaultExpanded
      />

      <JsonAccordion
        title={t('app.dev.outputJson')}
        text={outputJsonText}
      />
    </>
  )
}
