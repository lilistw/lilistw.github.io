import { useState, useEffect, useMemo } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { alpha } from '@mui/material/styles'
import {
  Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, IconButton, Link, Tab, Tabs, Tooltip, Typography,
} from '@mui/material'
import {
  Check, Close, ContentCopy, DarkModeOutlined, Favorite, GitHub,
  InfoOutlined, LightModeOutlined, ReceiptLongOutlined,
} from '@mui/icons-material'
import { dayTheme, nightTheme } from './theme.js'
import { readInput } from './pipeline/readInput.js'
import { calculate } from './pipeline/calculate.js'
import { buildTradeTotals, buildTaxSummary } from './domain/tradeSummary.js'
import { inferPriorPositions } from './services/inferPriorPositions.js'
import { getPrevYearDefaultAcqDate } from './domain/fx/fxRates.js'
import AboutSection from './components/AboutSection.jsx'
import Disclaimer from './components/Disclaimer.jsx'
import TermsContent from './components/TermsContent.jsx'
import Dropzone from './components/Dropzone.jsx'
import DataTable from './components/DataTable.jsx'
import TaxApp5 from './components/TaxApp5.jsx'
import TaxApp13 from './components/TaxApp13.jsx'
import TaxApp8Holdings from './components/TaxApp8Holdings.jsx'
import TaxApp8Dividends from './components/TaxApp8Dividends.jsx'
import PriorYearApproxWarning from './components/PriorYearApproxWarning.jsx'
import PriorYearPositionsForm from './components/PriorYearPositionsForm.jsx'

const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true'

// ── Small UI helpers ──────────────────────────────────────────────────────────

function CopyButton({ text }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <IconButton size="small" onClick={handleCopy} title={t('app.copyJson')} color={copied ? 'success' : 'default'}>
      {copied ? <Check fontSize="small" /> : <ContentCopy fontSize="small" />}
    </IconButton>
  )
}

function TermsModal({ onClose }) {
  const { t } = useTranslation()
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth scroll="paper">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {t('terms.title')}
        <IconButton size="small" onClick={onClose} aria-label={t('common.close')}>
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <TermsContent />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.close')}</Button>
      </DialogActions>
    </Dialog>
  )
}

function TabPanel({ children, value, index }) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null
}

// ── Result display ────────────────────────────────────────────────────────────

function ResultTabs({ result, inputJsonText, outputJsonText }) {
  const { t } = useTranslation()
  const [tab, setTab] = useState(0)

  const { taxYear, localCurrencyCode, localCurrencyLabel } = result
  const hasDividends = result.dividends.rows.length > 0
  const hasInterest  = result.interest.rows.filter(r => !r._total).length > 0

  // Mutable trade rows — user can toggle taxable status per row
  const [tradesDataRows, setTradesDataRows] = useState(() =>
    result.trades.rows.filter(r => !r._total)
  )

  const trades = useMemo(() => ({
    columns: result.trades.columns,
    rows:    [...tradesDataRows, ...buildTradeTotals(tradesDataRows, localCurrencyCode)],
  }), [result.trades.columns, tradesDataRows, localCurrencyCode])

  const taxSummary = useMemo(() => buildTaxSummary(tradesDataRows), [tradesDataRows])
  const approxRows = useMemo(
    () => tradesDataRows.filter(r => r.side === 'SELL' && r.costBasisBGNApprox),
    [tradesDataRows]
  )

  // Pending toggle — holds { rowIdx, row, newTaxable, newLabel } while dialog is open
  const [pendingToggle, setPendingToggle] = useState(null)

  function handleTaxableToggle(rowIdx) {
    const row = tradesDataRows[rowIdx]
    if (row.taxable === null) return
    const newTaxable = !row.taxable
    const newLabel   = newTaxable ? t('app.taxStatus.taxable') : t('app.taxStatus.exempt')
    setPendingToggle({ rowIdx, row, newTaxable, newLabel })
  }

  function confirmToggle() {
    const { rowIdx, newTaxable, newLabel } = pendingToggle
    setTradesDataRows(prev =>
      prev.map((r, i) => i === rowIdx ? { ...r, taxable: newTaxable, taxExemptLabel: newLabel } : r)
    )
    setPendingToggle(null)
  }

  const tabs = [
    { label: t('app.tabs.trades') },
    { label: t('app.tabs.positions') },
    ...(hasDividends ? [{ label: t('app.tabs.dividends') }] : []),
    ...(hasInterest  ? [{ label: t('app.tabs.interest') }] : []),
    ...(DEV_MODE     ? [{ label: t('app.tabs.dev') }]      : []),
  ]

  let idx = 0
  const TAB_TRADES    = idx++
  const TAB_HOLDINGS  = idx++
  const TAB_DIVIDENDS = hasDividends ? idx++ : -1
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

      <TabPanel value={tab} index={TAB_TRADES}>
        <DataTable title={t('app.tradesTableTitle')} data={trades} countLabel={t('app.countLabel.trades')} onCheckChange={handleTaxableToggle} />
        <PriorYearApproxWarning rows={approxRows} taxYear={taxYear} />
        <TaxApp5  summary={taxSummary.app5}  localCurrencyLabel={localCurrencyLabel} />
        <TaxApp13 summary={taxSummary.app13} localCurrencyLabel={localCurrencyLabel} />
      </TabPanel>

      <TabPanel value={tab} index={TAB_HOLDINGS}>
        <TaxApp8Holdings data={result.taxSummary.app8Holdings} />
      </TabPanel>

      {hasDividends && (
        <TabPanel value={tab} index={TAB_DIVIDENDS}>
          <TaxApp8Dividends data={result.taxSummary.app8Dividends} />
        </TabPanel>
      )}

      {hasInterest && (
        <TabPanel value={tab} index={TAB_INTEREST}>
          <Box sx={{
            display: 'flex', alignItems: 'flex-start', gap: 1.5,
            p: 2, mb: 2,
            bgcolor: (theme) => theme.palette.mode === 'dark'
              ? alpha(theme.palette.warning.main, 0.10)
              : '#FFFBEB',
            border: '1px solid',
            borderColor: (theme) => theme.palette.mode === 'dark'
              ? alpha(theme.palette.warning.main, 0.25)
              : '#FCD34D',
            borderRadius: 2,
          }}>
            <ReceiptLongOutlined sx={{ fontSize: 20, color: 'warning.main', mt: 0.1, flexShrink: 0 }} />
            <Box>
              <Typography variant="subtitle2" fontWeight={700} color="warning.dark" gutterBottom>
                {t('app.interest.title')}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                <Trans
                  i18nKey="app.interest.body"
                  values={{ localCurrencyLabel, localCurrencyCode }}
                  components={{ app6: <strong />, code: <strong />, em: <em /> }}
                />
              </Typography>
            </Box>
          </Box>
          <DataTable title={t('app.tabs.interest')} data={result.interest} countLabel={t('app.countLabel.payments')} />
        </TabPanel>
      )}

      {DEV_MODE && (
        <TabPanel value={tab} index={TAB_DEV}>
          <div className="output" style={{ marginBottom: 24 }}>
            <div className="output-header">
              <span className="output-count">Input JSON</span>
              <CopyButton text={inputJsonText} />
            </div>
            <pre className="json-output">{inputJsonText}</pre>
          </div>
          <div className="output">
            <div className="output-header">
              <span className="output-count">Output JSON</span>
              <CopyButton text={outputJsonText} />
            </div>
            <pre className="json-output">{outputJsonText}</pre>
          </div>
        </TabPanel>
      )}

      {pendingToggle && (
        <Dialog open onClose={() => setPendingToggle(null)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {t('app.changeStatusDialog.title')}
            <IconButton size="small" onClick={() => setPendingToggle(null)} aria-label={t('common.close')}>
              <Close fontSize="small" />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" gutterBottom>
              <strong>{pendingToggle.row.symbol}</strong> &nbsp;·&nbsp; {pendingToggle.row.dateTime}
            </Typography>
            <Typography variant="body2">
              {pendingToggle.row.taxExemptLabel} → <strong>{pendingToggle.newLabel}</strong>
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPendingToggle(null)}>{t('common.cancel')}</Button>
            <Button variant="contained" onClick={confirmToggle}>{t('common.confirm')}</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  )
}

// ── Main application ──────────────────────────────────────────────────────────

export default function App() {
  const { t } = useTranslation()
  const [nightMode, setNightMode] = useState(false)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', nightMode ? 'night' : 'day')
  }, [nightMode])

  const [csvFile,     setCsvFile]     = useState(null)
  const [csvFileUrl,  setCsvFileUrl]  = useState('')
  const [htmlFile,    setHtmlFile]    = useState(null)
  const [htmlFileUrl, setHtmlFileUrl] = useState('')

  // Parsed input data (Phase 1 output) — set when both files are loaded
  const [inputData, setInputData] = useState(null)
  const [parsing,   setParsing]   = useState(false)

  // Prior-year positions editable form state (null = not inferred yet)
  const [pendingPositions, setPendingPositions] = useState(null)

  // Result (Phase 2 output)
  const [result, setResult] = useState(null)
  const [error,  setError]  = useState(null)

  const [agreed,    setAgreed]    = useState(false)
  const [showTerms, setShowTerms] = useState(false)

  const taxYear = inputData?.taxYear ?? 2025


  // Object URL lifecycle for dropzone previews
  useEffect(() => {
    if (!csvFile) { setCsvFileUrl(''); return }
    const url = URL.createObjectURL(csvFile)
    setCsvFileUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [csvFile])

  useEffect(() => {
    if (!htmlFile) { setHtmlFileUrl(''); return }
    const url = URL.createObjectURL(htmlFile)
    setHtmlFileUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [htmlFile])

  // Phase 1 — read + parse files whenever both are available.
  // Infers prior-year positions so the user can review them before calculating.
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
        const prior = inferPriorPositions({
          trades:       data.trades,
          openPositions: data.openPositions,
          csvTrades:    data.csvTrades,
          instruments:  data.instruments,
          period:       data.statement.period,
        })
        const defaultAcqDate = getPrevYearDefaultAcqDate(data.taxYear)
        setPendingPositions(prior.map(p => ({
          ...p,
          costBGNInput:     p.costBGN != null ? String(Number(p.costBGN).toFixed(2)) : '',
          lastBuyDateInput: p.lastBuyDate ?? defaultAcqDate,
        })))
      })
      .catch(e => {
        if (cancelled) return
        setError(e.message)
        setInputData(null)
        setPendingPositions([])
      })
      .finally(() => { if (!cancelled) setParsing(false) })
    return () => { cancelled = true }
  }, [csvFile, htmlFile])

  // File selection handlers
  function selectCsvFile(f) {
    if (!f) return
    setCsvFile(f)
    setResult(null)
    setError(null)
  }
  function clearCsvFile() {
    setCsvFile(null)
    setResult(null)
    setError(null)
  }
  function selectHtmlFile(f) {
    setHtmlFile(f)
    setResult(null)
    setError(null)
  }
  function clearHtmlFile() {
    setHtmlFile(null)
    setResult(null)
    setError(null)
  }

  // Phase 2 — calculate from already-parsed inputData (synchronous)
  function handleCalculate() {
    if (!inputData || !agreed) return
    setError(null)
    setResult(null)
    try {
      const priorPositions = (pendingPositions ?? []).map(p => ({
        symbol:      p.symbol,
        currency:    p.currency,
        qty:         p.qty,
        costUSD:     p.costUSD,
        costBGN:     parseFloat(String(p.costBGNInput).replace(',', '.')) || 0,
        lastBuyDate: p.lastBuyDateInput || getPrevYearDefaultAcqDate(taxYear),
      }))
      setResult(calculate(inputData, priorPositions))
    } catch (e) {
      setError(e.message)
      console.error(e)
    }
  }

  async function handleLoadDemo() {
    try {
      const [csvResp, htmResp] = await Promise.all([
        fetch('/demo/U0_2025_activity_demo.csv'),
        fetch('/demo/U0_2025_trades_demo.htm'),
      ])
      const [csvText, htmText] = await Promise.all([csvResp.text(), htmResp.text()])
      selectCsvFile(new File([csvText], 'U0_2025_activity_demo.csv', { type: 'text/csv' }))
      setHtmlFile(  new File([htmText], 'U0_2025_trades_demo.htm',   { type: 'text/html' }))
    } catch (e) {
      setError(t('app.demoLoadError') + ' ' + e.message)
    }
  }

  const inputJsonText  = inputData ? JSON.stringify(inputData, null, 2) : ''
  const outputJsonText = result    ? JSON.stringify(result,    null, 2) : ''

  return (
    <ThemeProvider theme={nightMode ? nightTheme : dayTheme}>
      <CssBaseline />
    <div className="app">
      <header className="app-header">
        <Tooltip title={nightMode ? t('theme.switchDay') : t('theme.switchNight')} arrow>
          <IconButton
            onClick={() => setNightMode(n => !n)}
            size="small"
            sx={{
              position: 'absolute', top: 12, right: 16, zIndex: 2,
              color: 'rgba(255,255,255,0.7)',
              '&:hover': { color: '#fff', background: 'rgba(255,255,255,0.1)' },
            }}
          >
            {nightMode ? <LightModeOutlined fontSize="small" /> : <DarkModeOutlined fontSize="small" />}
          </IconButton>
        </Tooltip>
        <div className="header-inner">
          <Typography variant="title" component="h1" sx={{ fontSize: 40, fontWeight: 700 }}>
            {t('app.title')}
          </Typography>
          <AboutSection />
        </div>
      </header>

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

          {/* Terms + Calculate button */}
          {csvFile && htmlFile && !result && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1, flexWrap: 'wrap' }}>
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
              <ResultTabs result={result} inputJsonText={inputJsonText} outputJsonText={outputJsonText} />
            </>
          )}
        </main>
      </div>

      <footer className="app-footer">
        <div className="footer-links">
          <a href="https://github.com/lilistw/lilistw.github.io" target="_blank" rel="noopener noreferrer" className="footer-link">
            <GitHub sx={{ fontSize: 16 }} />
            GitHub
          </a>
          <span className="footer-sep">·</span>
          <button className="footer-link footer-btn" onClick={() => setShowTerms(true)}>
            <InfoOutlined sx={{ fontSize: 16 }} />
            {t('app.footer.termsLink')}
          </button>
          <span className="footer-sep">·</span>
          <Tooltip title={t('app.footer.supportTooltip')} arrow>
            <a href="https://dmsbg.com/7997/dms-divite/" target="_blank" rel="noopener noreferrer" className="footer-link footer-btn">
              <Favorite sx={{ fontSize: 16 }} />
              {t('app.footer.supportLink')}
            </a>
          </Tooltip>
        </div>
        <div className="footer-copy">
          {t('app.copyright')}
        </div>
      </footer>

      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
    </div>
    </ThemeProvider>
  )
}
