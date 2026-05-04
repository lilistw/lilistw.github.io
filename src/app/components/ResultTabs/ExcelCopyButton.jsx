import { useState } from 'react'
import { t } from '../../localization/i18n.js'
import { useLocale } from '../../hooks/useLocale.js'
import { Button, Tooltip } from '@mui/material'
import { ContentCopyOutlined, CheckOutlined, ErrorOutlineOutlined } from '@mui/icons-material'
import { ExcelPresenter } from '../presentation/ExcelPresenter.js'

const RESET_DELAY = 2500

export default function ExcelCopyButton({ result }) {
  useLocale()
  const [status, setStatus] = useState('idle')

  async function handleCopy() {
    try {
      const text = new ExcelPresenter({ t, lcl: result.taxContext.localCurrencyLabel }).buildTsv(result)
      await navigator.clipboard.writeText(text)
      setStatus('ok')
    } catch (error) {
      console.log('error copying to clipboard: ', error)
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
    <Tooltip title={t('app.copyExcelTooltip')} placement="left">
      <Button
        size="small"
        variant="outlined"
        color={color}
        startIcon={icon}
        onClick={handleCopy}
        sx={{ whiteSpace: 'nowrap' }}
      >
        {label}
      </Button>
    </Tooltip>
  )
}
