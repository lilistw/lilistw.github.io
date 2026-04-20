import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { Box, Button, Checkbox, FormControlLabel, Typography, Link, Alert } from '@mui/material'
import { InfoOutlined } from '@mui/icons-material'

import { dayTheme, nightTheme } from './theme.js'
import { readInput } from './pipeline/readInput.js'
import { calculateTax } from './services/taxService.js'
import { inferPriorPositions } from './services/inferPriorPositions.js'
import { getPrevYearDefaultAcqDate } from './domain/fx/fxRates.js'

import AppHeader from './components/AppHeader.jsx'
import AppFooter from './components/AppFooter.jsx'
import Disclaimer from './components/Disclaimer.jsx'
import TermsModal from './components/TermsModal.jsx'
import Dropzone from './components/Dropzone.jsx'
import ResultTabs from './components/ResultTabs/ResultTabs.jsx'
import PriorYearPositionsForm from './components/PriorYearPositionsForm.jsx'

export default function App() {
  const { t } = useTranslation()

  const [nightMode, setNightMode] = useState(false)

  // Theme attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', nightMode ? 'night' : 'day')
  }, [nightMode])

  // Files
  const [csvFile, setCsvFile] = useState(null)
  const [htmlFile, setHtmlFile] = useState(null)

  const [csvFileUrl, setCsvFileUrl] = useState('')
  const [htmlFileUrl, setHtmlFileUrl] = useState('')

  // Data pipeline
  const [inputData, setInputData] = useState(null)
  const [pendingPositions, setPendingPositions] = useState(null)
  const [result, setResult] = useState(null)

  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState(null)

  const [agreed, setAgreed] = useState(false)
  const [showTerms, setShowTerms] = useState(false)

  const taxYear = inputData?.taxYear ?? 2025

  // Object URL lifecycle
  useEffect(() => {
    if (!csvFile) return setCsvFileUrl('')
    const url = URL.createObjectURL(csvFile)
    setCsvFileUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [csvFile])

  useEffect(() => {
    if (!htmlFile) return setHtmlFileUrl('')
    const url = URL.createObjectURL(htmlFile)
    setHtmlFileUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [htmlFile])

  // Phase 1: parse input
  useEffect(() => {
    if (!csvFile || !htmlFile) {
      setInputData(null)
      setPendingPositions(null)
      return
    }

    let cancelled = false
    setParsing(true)
    setError(null)

    readInput({ csvFile, htmlFile })
      .then(data => {
        if (cancelled) return

        setInputData(data)

        const inferred = inferPriorPositions({
          trades: data.trades,
          openPositions: data.openPositions,
          csvTrades: data.csvTrades,
          instruments: data.instruments,
          period: data.statement.period,
        })

        const defaultDate = getPrevYearDefaultAcqDate(data.taxYear)

        setPendingPositions(
          inferred.map(p => ({
            ...p,
            costLclInput: p.costLcl != null ? String(Number(p.costLcl).toFixed(2)) : '',
            lastBuyDateInput: p.lastBuyDate ?? defaultDate,
          }))
        )
      })
      .catch(e => {
        if (cancelled) return
        setError(e.message)
        setInputData(null)
        setPendingPositions([])
      })
      .finally(() => {
        if (!cancelled) setParsing(false)
      })

    return () => { cancelled = true }
  }, [csvFile, htmlFile])

  // File handlers
  function selectCsvFile(file) {
    if (!file) return
    setCsvFile(file)
    setResult(null)
    setError(null)
  }

  function clearCsvFile() {
    setCsvFile(null)
    setResult(null)
    setError(null)
  }

  function selectHtmlFile(file) {
    setHtmlFile(file)
    setResult(null)
    setError(null)
  }

  function clearHtmlFile() {
    setHtmlFile(null)
    setResult(null)
    setError(null)
  }

  // Phase 2: calculate
  function handleCalculate() {
    if (!inputData || !agreed) return

    setError(null)
    setResult(null)

    try {
      const priorPositions = (pendingPositions ?? []).map(p => ({
        symbol: p.symbol,
        currency: p.currency,
        qty: p.qty,
        costUSD: p.costUSD,
        costLcl: parseFloat(String(p.costLclInput).replace(',', '.')) || 0,
        lastBuyDate: p.lastBuyDateInput || getPrevYearDefaultAcqDate(taxYear),
      }))

      setResult(calculateTax(inputData, priorPositions))
    } catch (e) {
      setError(e.message)
      console.error(e)
    }
  }

  async function handleLoadDemo() {
    try {
      const [csvResp, htmlResp] = await Promise.all([
        fetch('/demo/U0_2025_activity_demo.csv'),
        fetch('/demo/U0_2025_trades_demo.htm'),
      ])

      const [csvText, htmlText] = await Promise.all([
        csvResp.text(),
        htmlResp.text(),
      ])

      selectCsvFile(new File([csvText], 'demo.csv', { type: 'text/csv' }))
      setHtmlFile(new File([htmlText], 'demo.htm', { type: 'text/html' }))
    } catch (e) {
      setError(t('app.demoLoadError') + ' ' + e.message)
    }
  }

  const inputJsonText = inputData ? JSON.stringify(inputData, null, 2) : ''
  const outputJsonText = result ? JSON.stringify(result, null, 2) : ''

  return (
    <ThemeProvider theme={nightMode ? nightTheme : dayTheme}>
      <CssBaseline />

      <div className="app">
        <AppHeader nightMode={nightMode} setNightMode={setNightMode} />

        <div className="app-content">
          <main>
          {/* Dropzones */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <Box>
                <Dropzone
                file={csvFile} fileUrl={csvFileUrl}
                onFileSelect={selectCsvFile} onClearFile={clearCsvFile}
                accept=".csv" label={t('dropzone.csvLabel')} infoKey="csv"
                />
              <Typography variant="caption" color="text.secondary"
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: -1, mb: 1.5, px: 0.5 }}>
                <InfoOutlined sx={{ fontSize: 13 }} />
                {t('app.csvHint')}
                </Typography>
              </Box>
              <Box>
                <Dropzone
                file={htmlFile} fileUrl={htmlFileUrl}
                onFileSelect={selectHtmlFile} onClearFile={clearHtmlFile}
                accept=".htm,.html" label={t('dropzone.htmlLabel')} infoKey="htm"
                />
              <Typography variant="caption" color="text.secondary"
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: -1, mb: 1.5, px: 0.5 }}>
                <InfoOutlined sx={{ fontSize: 13 }} />
                {t('app.htmlHint')}
                </Typography>
              </Box>
            </Box>

                      {/* Terms + Calculate button */}
            {csvFile && htmlFile && !result && (
              <Box sx={{ 
                mb: 1,
                px: 2,
                py: 1,
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: 2, 
                mt: 1, 
                flexWrap: 'wrap' 
              }}>
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
                      {t('app.termsAgree')}{' '}
                    <Link component="button" variant="body2" onClick={() => setShowTerms(true)}
                      sx={{ verticalAlign: 'baseline' }}>
                        {t('app.termsAgreeLink')}
                      </Link>
                    </Typography>
                  }
                />

                <Button
                  variant="contained"
                  disabled={!inputData || !agreed || parsing}
                  onClick={handleCalculate}
                >
                  {parsing ? t('app.calculating') : t('app.calculate')}
                </Button>
              </Box>
            )}

          {/* Prior-year positions form — shown when inferred positions exist */}
          {!result && pendingPositions !== null && pendingPositions.length > 0 && (
              <PriorYearPositionsForm
                positions={pendingPositions}
                onPositionChange={(i, field, value) =>
                setPendingPositions(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p))
                }
                taxYear={taxYear}
              />
            )}

          {/* Demo load button — shown until files are selected */}
            {(!csvFile || !htmlFile) && (
            <Box
              sx={{
                mb: 1,
                px: 2,
                py: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                borderRadius: 1,
                bgcolor: 'rgba(255,255,255,0.04)',
              }}
            >
              <Typography variant="body2" color="text.secondary">
                {t('app.noFileQuestion')}
              </Typography>
                <Button variant="outlined" onClick={handleLoadDemo}>
                  {t('app.loadDemo')}
                </Button>
              </Box>
            )}

            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

            {result && (
              <>
                <Disclaimer />
                <ResultTabs
                  result={result}
                  inputJsonText={inputJsonText}
                  outputJsonText={outputJsonText}
                />
              </>
            )}

          </main>
        </div>

        <AppFooter onShowTerms={() => setShowTerms(true)} />

        {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
      </div>
    </ThemeProvider>
  )
}