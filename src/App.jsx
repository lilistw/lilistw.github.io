import { useState, useEffect } from 'react'
import {
  Alert, Box, Button, Checkbox, Dialog, DialogContent, DialogTitle,
  FormControlLabel, IconButton, Link, Tab, Tabs, Typography,
} from '@mui/material'
import { Check, Close, ContentCopy, GitHub, InfoOutlined, LinkedIn } from '@mui/icons-material'
import { processFile } from './services/processFile.js'
import AboutSection from './content/AboutSection.jsx'
import Disclaimer from './content/Disclaimer.jsx'
import TermsContent from './content/TermsContent.jsx'
import Dropzone from './components/Dropzone.jsx'
import DataTable from './components/DataTable.jsx'
import TaxApp5 from './components/TaxApp5.jsx'
import TaxApp13 from './components/TaxApp13.jsx'
import TaxApp8Holdings from './components/TaxApp8Holdings.jsx'
import TaxApp8Dividends from './components/TaxApp8Dividends.jsx'
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
      {copied ? <Check fontSize="small" /> : <ContentCopy fontSize="small" />}
    </IconButton>
  )
}

function TermsModal({ onClose }) {
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth scroll="paper">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Условия за ползване
        <IconButton size="small" onClick={onClose} aria-label="Затвори">
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <TermsContent onClose={onClose} />
      </DialogContent>
    </Dialog>
  )
}

function TabPanel({ children, value, index }) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null
}

function ResultTabs({ result, jsonText }) {
  const [tab, setTab] = useState(0)
  const hasDividends = result.dividends.rows.length > 0
  const hasInterest  = result.interest.rows.length > 0

  const tabs = [
    { label: 'Сделки' },
    { label: 'Позиции и Дивиденти' },
    ...(hasInterest  ? [{ label: 'Лихви' }]     : []),
    ...(DEV_MODE     ? [{ label: 'Dev' }]        : []),
  ]

  let idx = 0
  const TAB_TRADES    = idx++
  const TAB_HOLDINGS  = idx++
  const TAB_INTEREST  = hasInterest  ? idx++ : -1
  const TAB_DEV       = DEV_MODE     ? idx++ : -1

  return (
    <Box sx={{ mt: 2 }}>
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ borderBottom: 1, borderColor: 'divider', mb: 0 }}
      >
        {tabs.map((t, i) => <Tab key={i} label={t.label} />)}
      </Tabs>

      {/* Сделки: trades table + Прил. №5 (taxable) + Прил. №13 (EU ETF, untaxable) */}
      <TabPanel value={tab} index={TAB_TRADES}>
        <DataTable title="Trades – IBKR" data={result.trades} countLabel="сделки" />
        <TaxApp5  summary={result.taxSummary.app5} />
        <TaxApp13 summary={result.taxSummary.app13} />
      </TabPanel>

      {/* Позиции: holdings table + Прил. №8 Part I */}
      <TabPanel value={tab} index={TAB_HOLDINGS}>
        <DataTable title="Open Positions – IBKR" data={result.holdings} countLabel="позиции" />
        <TaxApp8Holdings data={result.taxSummary.app8Holdings} />
        {/* Дивиденти: dividends table + Прил. №8 Part III */}
        {hasDividends && (
          <TaxApp8Dividends data={result.taxSummary.app8Dividends} />
        )}
      </TabPanel>

      {/* Лихви: interest payments table */}
      {hasInterest && (
        <TabPanel value={tab} index={TAB_INTEREST}>
          <DataTable title="Лихви" data={result.interest} countLabel="плащания" />
        </TabPanel>
      )}

      {/* Dev: raw JSON */}
      {DEV_MODE && (
        <TabPanel value={tab} index={TAB_DEV}>
          <div className="output">
            <div className="output-header">
              <span className="output-count">
                JSON <span className="output-pill">{result.trades.rows.length + result.holdings.rows.length}</span>
              </span>
              <CopyButton text={jsonText} />
            </div>
            <pre className="json-output">{jsonText}</pre>
          </div>
        </TabPanel>
      )}
    </Box>
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
              <ResultTabs result={result} jsonText={jsonText} />
            </>
          )}
        </main>
      </div>

      <footer className="app-footer">
        <div className="footer-links">
          <a href="https://github.com/lilistw/ibkr-tax-app" target="_blank" rel="noopener noreferrer" className="footer-link">
            <GitHub sx={{ fontSize: 16 }} />
            GitHub
          </a>
          <span className="footer-sep">·</span>
          <a href="https://www.linkedin.com/in/lili-stoyanova/" className="footer-link">
            <LinkedIn sx={{ fontSize: 16 }} />
            LinkedIn
          </a>
          <span className="footer-sep">·</span>
          <button className="footer-link footer-btn" onClick={() => setShowTerms(true)}>
            <InfoOutlined sx={{ fontSize: 16 }} />
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
