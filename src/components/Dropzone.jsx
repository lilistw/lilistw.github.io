import { useState, useRef } from 'react'
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton,
  Link, Typography,
} from '@mui/material'
import { ArticleOutlined, Close, CloudUpload, InfoOutlined } from '@mui/icons-material'
import { CSV_INFO } from './dropzoneInfo.js'

export default function Dropzone({
  file, fileUrl, onFileSelect, onClearFile,
  accept = '.csv', label = 'IBKR Activity Statement CSV тук',
  showInfo: showInfoProp = true,
  infoContent = CSV_INFO,
}) {
  const [showInfo, setShowInfo] = useState(false)
  const inputRef = useRef(null)

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
            <Link href={fileUrl} download={file.name} aria-label="Свали файл" color="primary" sx={{ display: 'flex' }}>
              <ArticleOutlined sx={{ fontSize: 32 }} />
            </Link>
            <Link href={fileUrl} download={file.name} underline="hover" color="text.primary" sx={{ fontWeight: 600, fontSize: 14 }}>
              {file.name}
            </Link>
            <IconButton size="small" onClick={handleClearFile} aria-label="Премахни файл" sx={{ ml: 'auto' }}>
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
                <IconButton size="small" onClick={() => setShowInfo(true)} aria-label="Информация">
                  <InfoOutlined sx={{ fontSize: 15 }} />
                </IconButton>
              )}
            </Box>
            <Button variant="contained" size="small" onClick={() => inputRef.current?.click()}>
              Отвори файл
            </Button>
          </Box>
        )}
      </Box>

      {showInfoProp && (
        <Dialog open={showInfo} onClose={() => setShowInfo(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {infoContent.title}
            <IconButton size="small" onClick={() => setShowInfo(false)} aria-label="Затвори">
              <Close fontSize="small" />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ pt: 1, pb: 0 }}>
            <ol style={{ margin: 0, paddingLeft: 20 }}>
              {infoContent.steps.map((step, i) => <li key={i}>{step}</li>)}
            </ol>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button autoFocus variant="contained" onClick={() => setShowInfo(false)}>Затвори</Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  )
}
