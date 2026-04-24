import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@mui/material'
import { ContentCopyOutlined, CheckOutlined, ErrorOutlineOutlined } from '@mui/icons-material'
import { ExcelPresenter } from '../../presentation/ExcelPresenter.js'

const RESET_DELAY = 2500

export default function ExcelCopyButton({ result }) {
  const { t } = useTranslation()
  const [status, setStatus] = useState('idle')

  async function handleCopy() {
    try {
      const text = new ExcelPresenter({ t, lcl: result.localCurrencyLabel }).buildTsv(result)
      await navigator.clipboard.writeText(text)
      setStatus('ok')
    } catch {
      setStatus('error')
    } finally {
      setTimeout(() => setStatus('idle'), RESET_DELAY)
    }
  }

  const label =
    status === 'ok' ? t('app.copyExcelDone') :
    status === 'error' ? t('app.copyExcelError') :
    t('app.copyExcel')

  const icon =
    status === 'ok' ? <CheckOutlined fontSize="small" /> :
    status === 'error' ? <ErrorOutlineOutlined fontSize="small" /> :
    <ContentCopyOutlined fontSize="small" />

  const color = status === 'ok' ? 'success' : status === 'error' ? 'error' : 'primary'

  return (
    <Button
      size="small"
      variant="outlined"
      color={color}
      startIcon={icon}
      onClick={handleCopy}
      sx={{ ml: 1, mb: 0.5, whiteSpace: 'nowrap', alignSelf: 'flex-end', flexShrink: 0 }}
    >
      {label}
    </Button>
  )
}
