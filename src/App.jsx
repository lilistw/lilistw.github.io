import { useState, useEffect, useMemo } from 'react'
import {
  Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, IconButton, Link, Tab, Tabs, Typography,
} from '@mui/material'
import { Check, Close, ContentCopy, FavoriteOutlined, GitHub, InfoOutlined, Favorite, ReceiptLongOutlined } from '@mui/icons-material'
import { processFile, parseFilesData } from './services/processFile.js'
import { inferPriorPositions } from './services/inferPriorPositions.js'
import { getPrevYearDefaultAcqDate } from './domain/fx/fxRates.js'
import AboutSection from './content/AboutSection.jsx'
import Disclaimer from './content/Disclaimer.jsx'
import TermsContent from './content/TermsContent.jsx'
import Dropzone from './components/Dropzone.jsx'
import { HTM_INFO } from './components/dropzoneInfo.js'
import DataTable from './components/DataTable.jsx'
import TaxApp5 from './components/TaxApp5.jsx'
import TaxApp13 from './components/TaxApp13.jsx'
import TaxApp8Holdings from './components/TaxApp8Holdings.jsx'
import TaxApp8Dividends from './components/TaxApp8Dividends.jsx'
import PriorYearApproxWarning from './components/PriorYearApproxWarning.jsx'
import PriorYearPositionsForm from './components/PriorYearPositionsForm.jsx'
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
        <TermsContent />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Затвори</Button>
      </DialogActions>
    </Dialog>
  )
}

function TabPanel({ children, value, index }) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null
}

// ── Helpers for dynamic trades totals & tax summary ──────────────────────────
const TRADE_SUM_COLS     = ['proceeds', 'comm', 'fee', 'totalWithFee']
const TRADE_SUM_BGN_COLS = ['totalWithFeeBGN', 'costBasisBGN']

function buildTradeTotals(dataRows, localCurrencyCode = 'BGN') {
  const totals = []
  for (const label of ['Облагаем', 'Освободен']) {
    const group = dataRows.filter(r => r.taxExemptLabel === label)
    if (group.length === 0) continue
    for (const cur of ['EUR', 'USD']) {
      const subset = group.filter(r => r.currency === cur)
      if (subset.length === 0) continue
      const row = { _total: true, taxExemptLabel: label, currency: cur }
      TRADE_SUM_COLS.forEach(k     => { row[k] = subset.reduce((s, r) => s + (r[k] ?? 0), 0) })
      TRADE_SUM_BGN_COLS.forEach(k => { row[k] = subset.reduce((s, r) => s + (r[k] ?? 0), 0) })
      totals.push(row)
    }
    const lclRow = { _total: true, taxExemptLabel: label, currency: localCurrencyCode }
    TRADE_SUM_BGN_COLS.forEach(k => { lclRow[k] = group.reduce((s, r) => s + (r[k] ?? 0), 0) })
    totals.push(lclRow)
  }
  return totals
}

function buildTaxSummary(dataRows) {
  const sells   = dataRows.filter(r => r.type === 'SELL')
  const taxable = sells.filter(r => r.taxable === true)
  const exempt  = sells.filter(r => r.taxable === false)
  const summarize = group => {
    const totalProceedsBGN  = group.reduce((s, r) => s + (r.totalWithFeeBGN ?? 0), 0)
    const totalCostBasisBGN = group.reduce((s, r) => s + (r.costBasisBGN ?? 0), 0)
    const profits = group.reduce((s, r) => {
      const pl = (r.totalWithFeeBGN ?? 0) - (r.costBasisBGN ?? 0)
      return pl > 0 ? s + pl : s
    }, 0)
    const losses = group.reduce((s, r) => {
      const pl = (r.totalWithFeeBGN ?? 0) - (r.costBasisBGN ?? 0)
      return pl < 0 ? s + Math.abs(pl) : s
    }, 0)
    return { totalProceedsBGN, totalCostBasisBGN, profits, losses }
  }
  return { app5: summarize(taxable), app13: summarize(exempt) }
}

function ResultTabs({ result, jsonText }) {
  const [tab, setTab] = useState(0)
  const hasDividends = result.dividends.rows.length > 0
  const hasInterest  = result.interest.rows.filter(r => !r._total).length > 0

  const { taxYear, localCurrencyCode, localCurrencyLabel } = result

  // Mutable trades data rows (user can toggle taxable status)
  const [tradesDataRows, setTradesDataRows] = useState(() =>
    result.trades.rows.filter(r => !r._total)
  )

  const trades = useMemo(() => ({
    columns: result.trades.columns,
    rows: [...tradesDataRows, ...buildTradeTotals(tradesDataRows, localCurrencyCode)],
  }), [result.trades.columns, tradesDataRows, localCurrencyCode])

  const taxSummary = useMemo(() => buildTaxSummary(tradesDataRows), [tradesDataRows])
  const approxRows = useMemo(
    () => tradesDataRows.filter(r => r.type === 'SELL' && r.costBasisBGNApprox),
    [tradesDataRows]
  )

  // Pending toggle — holds { rowIdx, row, newTaxable, newLabel } while dialog is open
  const [pendingToggle, setPendingToggle] = useState(null)

  function handleTaxableToggle(rowIdx) {
    const row = tradesDataRows[rowIdx]
    if (row.taxable === null) return
    const newTaxable = !row.taxable
    const newLabel   = newTaxable ? 'Облагаем' : 'Освободен'
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
    { label: 'Сделки' },
    { label: 'Позиции' },
    ...(hasDividends ? [{ label: 'Дивиденти' }]  : []),
    ...(hasInterest  ? [{ label: 'Лихви' }]       : []),
    ...(DEV_MODE     ? [{ label: 'Dev' }]          : []),
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

      {/* Сделки */}
      <TabPanel value={tab} index={TAB_TRADES}>
        <DataTable title="Trade Confirmation – Сделки" data={trades} countLabel="сделки" onCheckChange={handleTaxableToggle} />
        <PriorYearApproxWarning rows={approxRows} taxYear={taxYear} />
        <TaxApp5  summary={taxSummary.app5}  localCurrencyLabel={localCurrencyLabel} />
        <TaxApp13 summary={taxSummary.app13} localCurrencyLabel={localCurrencyLabel} />
      </TabPanel>

      {/* Позиции */}
      <TabPanel value={tab} index={TAB_HOLDINGS}>
        <TaxApp8Holdings data={result.taxSummary.app8Holdings} />
      </TabPanel>

      {/* Дивиденти */}
      {hasDividends && (
        <TabPanel value={tab} index={TAB_DIVIDENDS}>
          <TaxApp8Dividends data={result.taxSummary.app8Dividends} />
        </TabPanel>
      )}

      {/* Лихви */}
      {hasInterest && (
        <TabPanel value={tab} index={TAB_INTEREST}>
          <Box sx={{
            display: 'flex', alignItems: 'flex-start', gap: 1.5,
            p: 2, mb: 2,
            bgcolor: '#FFFBEB',
            border: '1px solid',
            borderColor: '#FCD34D',
            borderRadius: 2,
          }}>
            <ReceiptLongOutlined sx={{ fontSize: 20, color: 'warning.main', mt: 0.1, flexShrink: 0 }} />
            <Box>
              <Typography variant="subtitle2" fontWeight={700} color="warning.dark" gutterBottom>
                Приложение №6 – Доходи от други източници (чл. 35 ЗДДФЛ)
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                Лихвите от IBKR се декларират в <strong>Приложение №6</strong>, Ред 6,{' '}
                <strong>Код 606</strong>: „Обща сума на доходите с код 606, платците на които не са
                предприятия или самоосигуряващи се лица". В поле <em>Размер на дохода</em> въведете
                общата сума в {localCurrencyLabel} ({localCurrencyCode}), изчислена по курс на БНБ
                за датата на всяко плащане.
              </Typography>
            </Box>
          </Box>
          <DataTable title="Лихви" data={result.interest} countLabel="плащания" />
        </TabPanel>
      )}

      {/* Dev */}
      {DEV_MODE && (
        <TabPanel value={tab} index={TAB_DEV}>
          <div className="output">
            <div className="output-header">
              <span className="output-count">
                JSON <span className="output-pill">{result.holdings.rows.length}</span>
              </span>
              <CopyButton text={jsonText} />
            </div>
            <pre className="json-output">{jsonText}</pre>
          </div>
        </TabPanel>
      )}

      {/* Confirmation dialog for taxable status toggle */}
      {pendingToggle && (
        <Dialog open onClose={() => setPendingToggle(null)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            Промяна на данъчен статус
            <IconButton size="small" onClick={() => setPendingToggle(null)} aria-label="Затвори">
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
            <Button onClick={() => setPendingToggle(null)}>Откажи</Button>
            <Button variant="contained" onClick={confirmToggle}>Потвърди</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  )
}

export default function App() {
  // ── File states ──────────────────────────────────────────────
  const [csvFile, setCsvFile] = useState(null)
  const [csvFileUrl, setCsvFileUrl] = useState('')
  const [htmlFile, setHtmlFile] = useState(null)
  const [htmlFileUrl, setHtmlFileUrl] = useState('')

  // ── Prior-year positions (controlled form state, lifted here) ────────────
  // null  = not yet inferred / files not both loaded
  // []    = inferred, no prior positions found
  // [...] = editable prior positions (form shown above button row)
  const [pendingPositions, setPendingPositions] = useState(null)
  const [taxYear, setTaxYear] = useState(2025)
  const [parsing, setParsing] = useState(false)

  // ── Results and UI states ────────────────────────────────────
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [showTerms, setShowTerms] = useState(false)

  // ── File URL effects ─────────────────────────────────────────
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

  // ── Preliminary parse: infer prior-year positions when both files ready ──
  useEffect(() => {
    if (!csvFile || !htmlFile) {
      setPendingPositions(null)
      return
    }
    let cancelled = false
    setParsing(true)
    parseFilesData({ csvFile, htmlFile })
      .then(data => {
        if (cancelled) return
        const yr = data.taxYear ?? 2025
        setTaxYear(yr)
        const prior = inferPriorPositions({
          htmlTrades:     data.processedTrades.rows,
          openPositions:  data.openPositions.rows,
          csvTradeBasis:  data.csvTradeBasis,
          instrumentInfo: data.instrumentInfo,
          taxYear:        yr,
        })
        // Convert inferred positions to editable form objects
        const defaultAcqDate = getPrevYearDefaultAcqDate(yr)
        setPendingPositions(prior.map(p => ({
          ...p,
          costBGNInput:    p.costBGN != null ? String(Number(p.costBGN).toFixed(2)) : '',
          lastBuyDateInput: p.lastBuyDate ?? defaultAcqDate,
        })))
      })
      .catch(e => {
        if (cancelled) return
        console.warn('Prior-year inference failed:', e)
        setPendingPositions([])
      })
      .finally(() => { if (!cancelled) setParsing(false) })
    return () => { cancelled = true }
  }, [csvFile, htmlFile])

  // ── File selection handlers ──────────────────────────────────
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

  // ── Calculate ────────────────────────────────────────────────
  async function handleCalculate() {
    if (!csvFile || !htmlFile || !agreed || parsing) return
    setError(null)
    setResult(null)
    setLoading(true)
    try {
      // Convert form editable objects to processFile format
      const priorPositions = (pendingPositions ?? []).map(p => ({
        symbol:      p.symbol,
        currency:    p.currency,
        qty:         p.qty,
        costUSD:     p.costUSD,
        costBGN:     parseFloat(String(p.costBGNInput).replace(',', '.')) || 0,
        lastBuyDate: p.lastBuyDateInput || getPrevYearDefaultAcqDate(taxYear),
      }))
      const res = await processFile({ csvFile, htmlFile, priorPositions })
      setResult(res)
    } catch (e) {
      setError(e.message)
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function loadBothDemoFiles() {
    const [csvResp, htmResp] = await Promise.all([
      fetch('/demo/U0_2025_activity_demo.csv'),
      fetch('/demo/U0_2025_trades_demo.htm'),
    ])
    const [csvText, htmText] = await Promise.all([csvResp.text(), htmResp.text()])
    selectCsvFile(new File([new Blob([csvText], { type: 'text/csv' })],  'U0_2025_activity_demo.csv', { type: 'text/csv' }))
    setHtmlFile(  new File([new Blob([htmText], { type: 'text/html' })], 'U0_2025_trades_demo.htm',  { type: 'text/html' }))
  }

  async function handleLoadDemo() {
    try { await loadBothDemoFiles() }
    catch (e) { setError('Неуспешно зареждане на демо файл: ' + e.message) }
  }

  const jsonText = result ? JSON.stringify(result, null, 2) : ''

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <Typography variant="title" component="h1" sx={{ fontSize: 40, fontWeight: 700 }}>
            IBKR Данъчен калкулатор
          </Typography>
          <AboutSection />
        </div>
      </header>

      <div className="app-content">
        <main>
          {/* ── Two dropzones ──────────────────────────────────────── */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <Box>
              <Dropzone
                file={csvFile} fileUrl={csvFileUrl}
                onFileSelect={selectCsvFile} onClearFile={clearCsvFile}
                accept=".csv" label="Activity Statement CSV тук"
              />
              <Typography variant="caption" color="text.secondary"
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: -1, mb: 1.5, px: 0.5 }}>
                <InfoOutlined sx={{ fontSize: 13 }} />
                IBKR Portal → Reports → Statements → Activity (формат CSV)
              </Typography>
            </Box>
            <Box>
              <Dropzone
                file={htmlFile} fileUrl={htmlFileUrl}
                onFileSelect={selectHtmlFile} onClearFile={clearHtmlFile}
                accept=".htm,.html" label="Trade Confirmation HTML тук"
                infoContent={HTM_INFO}
              />
              <Typography variant="caption" color="text.secondary"
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: -1, mb: 1.5, px: 0.5 }}>
                <InfoOutlined sx={{ fontSize: 13 }} />
                IBKR Portal → Reports → Trade Confirmation (формат HTML)
              </Typography>
            </Box>
          </Box>

          {/* ── Prior-year positions form (above button row) ────────── */}
          {!result && pendingPositions !== null && pendingPositions.length > 0 && (
            <PriorYearPositionsForm
              positions={pendingPositions}
              onPositionChange={(i, field, value) =>
                setPendingPositions(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p))
              }
              taxYear={taxYear}
            />
          )}

          {/* ── Checkbox + Изчисли ────────────────────────────── */}
          {csvFile && htmlFile && !result
            && (
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
                  Съгласен/на съм с{' '}
                  <Link component="button" variant="body2" onClick={() => setShowTerms(true)}
                    sx={{ verticalAlign: 'baseline' }}>
                    условията за ползване
                  </Link>
                </Typography>
              }
            />
            <Button
              variant="contained"
              disabled={!csvFile || !htmlFile || !agreed || loading || parsing}
              onClick={handleCalculate}
            >
              {loading ? 'Изчислява се...' : parsing ? 'Зарежда се...' : 'Изчисли'}
            </Button>
          </Box>
          )}

          {/* ── Демо ──────────────────────────────*/}
          
          {(!csvFile || !htmlFile) && !loading && !parsing
            && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1, flexWrap: 'wrap' }}>
              <Button variant="outlined" onClick={handleLoadDemo}>
                Зареди демо
              </Button>
            </Box>
          )}

          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

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
          <a href="https://github.com/lilistw/lilistw.github.io" target="_blank" rel="noopener noreferrer" className="footer-link">
            <GitHub sx={{ fontSize: 16 }} />
            GitHub
          </a>
          <span className="footer-sep">·</span>
          <button className="footer-link footer-btn" onClick={() => setShowTerms(true)}>
            <InfoOutlined sx={{ fontSize: 16 }} />
            Условия&nbsp;за&nbsp;ползване
          </button>
          <span className="footer-sep">·</span>
          <a href="https://dmsbg.com/7997/dms-divite/" target="_blank" rel="noopener noreferrer" className="footer-link footer-btn">
            <Favorite sx={{ fontSize: 16 }} />
            Подкрепи кауза
          </a>
        </div>
        <div className="footer-copy">
          © 2026 IBKR Данъчен калкулатор. Всички права запазени.
        </div>
      </footer>

      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
    </div>
  )
}
