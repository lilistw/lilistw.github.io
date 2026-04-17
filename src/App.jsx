import { useState, useEffect, useMemo } from 'react'
import {
  Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, IconButton, Link, Tab, Tabs, Tooltip, Typography,
} from '@mui/material'
import {
  Check, Close, ContentCopy, Favorite, GitHub, InfoOutlined, ReceiptLongOutlined,
} from '@mui/icons-material'
import { readInput } from './pipeline/readInput.js'
import { calculate } from './pipeline/calculate.js'
import { buildTradeTotals, buildTaxSummary } from './domain/tradeSummary.js'
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

// ── Small UI helpers ──────────────────────────────────────────────────────────

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

// ── Result display ────────────────────────────────────────────────────────────

function ResultTabs({ result, jsonText }) {
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
    ...(hasDividends ? [{ label: 'Дивиденти' }] : []),
    ...(hasInterest  ? [{ label: 'Лихви' }]     : []),
    ...(DEV_MODE     ? [{ label: 'Dev' }]        : []),
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
        <DataTable title="Trade Confirmation – Сделки" data={trades} countLabel="сделки" onCheckChange={handleTaxableToggle} />
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

// ── Main application ──────────────────────────────────────────────────────────

export default function App() {
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
          htmlTrades:     data.trades.rows,
          openPositions:  data.openPositions.rows,
          csvTradeBasis:  data.csvTradeBasis,
          instrumentInfo: data.instrumentInfo,
          taxYear:        data.taxYear,
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
      setError('Неуспешно зареждане на демо файл: ' + e.message)
    }
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
          {/* Dropzones */}
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
                disabled={!inputData || !agreed || parsing}
                onClick={handleCalculate}
              >
                {parsing ? 'Зарежда се...' : 'Изчисли'}
              </Button>
            </Box>
          )}

          {/* Demo load button — shown until files are selected */}
          {!csvFile && !htmlFile && (
            <Box sx={{ mt: 1 }}>
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
          <Tooltip title={'Подкрепи фондация \u201e\u0414\u0438\u0432\u0438\u0442\u0435 \u0436\u0438\u0432\u043e\u0442\u043d\u0438\u201c'} arrow>
            <a href="https://dmsbg.com/7997/dms-divite/" target="_blank" rel="noopener noreferrer" className="footer-link footer-btn">
              <Favorite sx={{ fontSize: 16 }} />
              Подкрепи кауза
            </a>
          </Tooltip>
        </div>
        <div className="footer-copy">
          © 2026 IBKR Данъчен калкулатор. Всички права запазени.
        </div>
      </footer>

      {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}
    </div>
  )
}
