import { useState, useRef } from 'react'
import {
  Box, Button, Dialog, DialogContent, DialogTitle, IconButton,
  Link, Typography,
} from '@mui/material'
import { FiUploadCloud, FiFileText, FiX, FiInfo } from 'react-icons/fi'

export default function Dropzone({ file, fileUrl, onFileSelect, onClearFile, onLoadDemo }) {
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
      <Box
        className="dropzone"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <input
          id="file-input"
          ref={inputRef}
          type="file"
          accept=".csv"
          onChange={handleInputChange}
          style={{ position: 'absolute', width: 0, height: 0, opacity: 0 }}
        />

        {file ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Link href={fileUrl} download={file.name} aria-label="Свали файл" color="primary" sx={{ display: 'flex' }}>
              <FiFileText size={32} aria-hidden="true" />
            </Link>
            <Link href={fileUrl} download={file.name} underline="hover" color="text.primary" sx={{ fontWeight: 600, fontSize: 14 }}>
              {file.name}
            </Link>
            <IconButton size="small" onClick={handleClearFile} aria-label="Премахни файл" sx={{ ml: 'auto' }}>
              <FiX size={18} aria-hidden="true" />
            </IconButton>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
            <FiUploadCloud className="dropzone-icon" size={32} aria-hidden="true" />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                Пуснете IBKR Activity Statement CSV тук
              </Typography>
              <IconButton
                size="small"
                onClick={() => setShowInfo(true)}
                aria-label="Информация за Activity Statement"
              >
                <FiInfo size={15} aria-hidden="true" />
              </IconButton>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                size="small"
                onClick={() => inputRef.current?.click()}
              >
                Отвори файл
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={onLoadDemo}
              >
                Зареди демо
              </Button>
            </Box>
          </Box>
        )}
      </Box>

      <Dialog open={showInfo} onClose={() => setShowInfo(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Как да изтеглите Activity Statement
          <IconButton size="small" onClick={() => setShowInfo(false)} aria-label="Затвори">
            <FiX size={16} aria-hidden="true" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <ol>
            <li>Влезте в Client Portal на Interactive Brokers</li>
            <li>Отидете на Performance&nbsp;&amp;&nbsp;Reports &gt; Statements &gt; Activity&nbsp;Statement</li>
            <li>Изберете желания период &mdash; "Annual"</li>
            <li>Генерирайте и изтеглете CSV файла</li>
          </ol>
        </DialogContent>
      </Dialog>
    </>
  )
}
