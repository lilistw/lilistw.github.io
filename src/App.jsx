import { useState, useEffect } from 'react'
import {
  Alert, Box, Button, Checkbox, Dialog, DialogContent, DialogTitle,
  FormControlLabel, IconButton, Link, Typography,
} from '@mui/material'
import { FiCheck, FiCopy, FiGithub, FiInfo, FiMail, FiX } from 'react-icons/fi'
import { processFile } from './services/processFile.js'
import AboutSection from './content/AboutSection.jsx'
import Disclaimer from './content/Disclaimer.jsx'
import TermsContent from './content/TermsContent.jsx'
import Dropzone from './components/Dropzone.jsx'
import DataTable from './components/DataTable.jsx'
import './App.css'

const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true'

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <IconButton size="small" onClick={handleCopy} title="Копирай JSON" color={copied ? 'success' : 'default'}>
      {copied ? <FiCheck size={16} aria-hidden="true" /> : <FiCopy size={16} aria-hidden="true" />}
    </IconButton>
  )
}

function TermsModal({ onClose }) {
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth scroll="paper">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Условия за ползване
        <IconButton size="small" onClick={onClose} aria-label="Затвори">
          <FiX size={16} aria-hidden="true" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <TermsContent onClose={onClose} />
      </DialogContent>
    </Dialog>
  )
}

export default function App() {
  const [file, setFile] = useState(null)
  const [fileUrl, setFileUrl] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [showTerms, setShowTerms] = useState(false)

  function selectFile(f) {
    if (!f) return
    setFile(f)
    setResult(null)
    setError(null)
  }

  useEffect(() => {
    if (!file) { setFileUrl(''); return }
    const url = URL.createObjectURL(file)
    setFileUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  async function handleCalculate() {
    if (!file || !agreed) return
    setError(null)
    setResult(null)
    setLoading(true)
    try {
      const data = await processFile(file)
      setResult(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function handleClearFile() {
    setFile(null)
    setResult(null)
    setError(null)
  }

  async function handleLoadDemo() {
    try {
      const response = await fetch('/demo/U0_2025_activity_demo.csv')
      const text = await response.text()
      const blob = new Blob([text], { type: 'text/csv' })
      selectFile(new File([blob], 'U0_2025_activity_demo.csv', { type: 'text/csv' }))
    } catch (e) {
      setError('Неуспешно зареждане на демо файл: ' + e.message)
    }
  }

  const jsonText = result ? JSON.stringify(result, null, 2) : ''

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <h1>IBKR Данъчен Калкулатор</h1>
          <p>Качете Activity Statement CSV от Interactive Brokers</p>
        </div>
      </header>

      <div className="app-content">
        <AboutSection />

        <main>
          <Dropzone
            file={file}
            fileUrl={fileUrl}
            onFileSelect={selectFile}
            onClearFile={handleClearFile}
            onLoadDemo={handleLoadDemo}
          />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2, flexWrap: 'wrap' }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={agreed}
                  onChange={e => setAgreed(e.target.checked)}
                  size="small"
                  color="primary"
                />
              }
              label={
                <Typography variant="body2">
                  Съгласен/на съм с{' '}
                  <Link
                    component="button"
                    variant="body2"
                    onClick={() => setShowTerms(true)}
                    sx={{ verticalAlign: 'baseline' }}
                  >
                    условията за ползване
                  </Link>
                </Typography>
              }
            />
            <Button
              variant="contained"
              disabled={!file || !agreed || loading}
              onClick={handleCalculate}
            >
              {loading ? 'Изчислява се...' : 'Изчисли'}
            </Button>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          {result && (
            <>
              <Disclaimer />
              <DataTable title="Сделки" data={result.trades} countLabel="сделки" />
              <DataTable title="Позиции" data={result.holdings} countLabel="позиции" />
              {DEV_MODE && (
                <div className="output">
                  <div className="output-header">
                    <span className="output-count">
                      JSON <span className="output-pill">{result.trades.rows.length + result.holdings.rows.length}</span>
                    </span>
                    <CopyButton text={jsonText} />
                  </div>
                  <pre className="json-output">{jsonText}</pre>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      <footer className="app-footer">
        <div className="footer-links">
          <a href="https://github.com/lilistw/ibkr-tax-app" target="_blank" rel="noopener noreferrer" className="footer-link">
            <FiGithub size={16} aria-hidden="true" />
            GitHub
          </a>
          <span className="footer-sep">·</span>
          <a href="mailto:lili.st.work@gmail.com" className="footer-link">
            <FiMail size={16} aria-hidden="true" />
            Контакти
          </a>
          <span className="footer-sep">·</span>
          <button className="footer-link footer-btn" onClick={() => setShowTerms(true)}>
            <FiInfo size={16} aria-hidden="true" />
            Условия&nbsp;за&nbsp;ползване
          </button>
        </div>
        <hr />
        <div className="footer-copy">
          © 2026 IBKR Данъчен калкулатор. Всички права запазени.
        </div>
      </footer>

      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
    </div>
  )
}
