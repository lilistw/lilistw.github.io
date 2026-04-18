import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IconButton } from '@mui/material'
import { Check, ContentCopy } from '@mui/icons-material'

export default function CopyButton({ text }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch (e) {
      console.error('Copy failed', e)
    }
  }

  return (
    <IconButton
      size="small"
      onClick={handleCopy}
      title={t('app.copyJson')}
      color={copied ? 'success' : 'default'}
    >
      {copied
        ? <Check fontSize="small" />
        : <ContentCopy fontSize="small" />}
    </IconButton>
  )
}