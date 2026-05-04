import { useState, useRef } from 'react'
import { t } from '../localization/i18n.js'
import { useLocale } from '../hooks/useLocale.js'
import {
  Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton,
  Link, Typography,
} from '@mui/material'
import { ArticleOutlined, Close, CloudUpload, InfoOutlined } from '@mui/icons-material'

export default function Dropzone({
  file, fileUrl, onFileSelect, onClearFile,
  accept = '.csv', label,
  showInfo: showInfoProp = true,
  infoKey = 'csv',
  fileType,
  hint,
}) {
  useLocale()
  const [showInfo, setShowInfo] = useState(false)
  const inputRef = useRef(null)

  const infoTitle = t(`dropzoneInfo.${infoKey}.title`)
  const infoSteps = t(`dropzoneInfo.${infoKey}.steps`, { returnObjects: true })

  function handleInputChange(e) {
    onFileSelect(e.target.files[0])
  }

  function handleDrop(e) {
    e.preventDefault()
    onFileSelect(e.dataTransfer.files[0])
  }

  function handleDragOver(e) {
    e.preventDefault()
  }

  function handleClearFile() {
    if (inputRef.current) inputRef.current.value = ''
    onClearFile()
  }

  return (
    <>
      <Box className="dropzone" onDrop={handleDrop} onDragOver={handleDragOver}>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          style={{ position: 'absolute', width: 0, height: 0, opacity: 0 }}
        />

        {file ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Link href={fileUrl} download={file.name} aria-label={t('dropzone.downloadFile')} color="primary" sx={{ display: 'flex' }}>
              <ArticleOutlined sx={{ fontSize: 32 }} />
            </Link>
            <Link href={fileUrl} download={file.name} underline="hover" color="text.primary" sx={{ fontWeight: 600, fontSize: 14 }}>
              {file.name}
            </Link>
            {fileType && (
              <Chip label={fileType} size="small" variant="outlined" sx={{ fontSize: 11, height: 20 }} />
            )}
            <IconButton size="small" onClick={handleClearFile} aria-label={t('dropzone.removeFile')} sx={{ ml: 'auto' }}>
              <Close fontSize="small" />
            </IconButton>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
            <CloudUpload className="dropzone-icon" sx={{ fontSize: 32 }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                {label}
              </Typography>
              {showInfoProp && (
                <IconButton size="small" onClick={() => setShowInfo(true)} aria-label={t('dropzone.info')}>
                  <InfoOutlined sx={{ fontSize: 15 }} />
                </IconButton>
              )}
            </Box>
            <Button variant="contained" size="small" onClick={() => inputRef.current?.click()}>
              {t('dropzone.openFile')}
            </Button>
          </Box>
        )}
      </Box>

      {hint && showInfoProp && (
        <Link
          component="button"
          variant="caption"
          color="text.secondary"
          underline="hover"
          onClick={() => setShowInfo(true)}
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: -1, mb: 1.5, px: 0.5 }}
        >
          <InfoOutlined sx={{ fontSize: 13 }} />
          {hint}
        </Link>
      )}

      {showInfoProp && (
        <Dialog open={showInfo} onClose={() => setShowInfo(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {infoTitle}
            <IconButton size="small" onClick={() => setShowInfo(false)} aria-label={t('common.close')}>
              <Close fontSize="small" />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ pt: 1, pb: 0 }}>
            <ol style={{ margin: 0, paddingLeft: 20 }}>
              {infoSteps.map((step, i) => <li key={i}>{step}</li>)}
            </ol>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button autoFocus variant="contained" onClick={() => setShowInfo(false)}>{t('common.close')}</Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  )
}
