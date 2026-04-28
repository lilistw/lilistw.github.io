import { useState, useEffect } from 'react'
import { t } from '../localization/i18n.js'
import { SUPPORTED_FORMATS } from '../config.js'
import { readInputFromFiles } from '../platform/web/fileReader.js'
import { calculateTax } from '../core/services/calculateTax.js'
import { inferPriorPositions } from '../core/services/inferPriorPositions.js'
import { getPrevYearEndDate } from '../core/domain/fx/fxRates.js'
import { useThemeMode } from './useThemeMode.js'
import { decimalJsonReplacer } from '../core/domain/numStr.js'

export function useTaxAppController() {
  const [nightMode, setNightMode] = useThemeMode()
  const [costBasisStrategy, setCostBasisStrategy] = useState('ibkr')

  // Files — csvFile holds either a CSV or PDF Activity Statement
  const [csvFile, setCsvFile] = useState(null)
  const [htmlFile, setHtmlFile] = useState(null)

  const [csvFileUrl, setCsvFileUrl] = useState('')
  const [htmlFileUrl, setHtmlFileUrl] = useState('')

  const isPdf = csvFile?.name?.toLowerCase().endsWith('.pdf') ?? false
  const isHtmlPdf = htmlFile?.name?.toLowerCase().endsWith('.pdf') ?? false

  // Data pipeline
  const [inputData, setInputData] = useState(null)
  const [pendingPositions, setPendingPositions] = useState(null)
  const [result, setResult] = useState(null)

  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState(null)

  const [agreed, setAgreed] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)

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

    readInputFromFiles({
      csvFile:      isPdf     ? undefined : csvFile,
      pdfFile:      isPdf     ? csvFile   : undefined,
      htmlFile:     isHtmlPdf ? undefined : htmlFile,
      tradePdfFile: isHtmlPdf ? htmlFile  : undefined,
    })
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

        const defaultDate = getPrevYearEndDate(data.taxYear)

        setPendingPositions(
          inferred.map(p => ({
            ...p,
            costUSDInput: p.costUSD != null ? String(Number(p.costUSD).toFixed(2)) : '',
            costLclInput: p.costLcl != null ? String(Number(p.costLcl).toFixed(2)) : '',
            lastBuyDateInput: p.lastBuyDate ?? defaultDate,
          }))
        )
      })
      .catch(e => {
        if (cancelled) return
        const msg = e.code
          ? t(`errors.${e.code.toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase())}`, e)
          : e.message
        setError(msg)
        setInputData(null)
        setPendingPositions([])
      })
      .finally(() => {
        if (!cancelled) setParsing(false)
      })

    return () => { cancelled = true }
  }, [csvFile, htmlFile])

  function selectCsvFile(file) {
    if (!file) return
    const name = file.name.toLowerCase()
    const pdfOk = SUPPORTED_FORMATS.pdf && name.endsWith('.pdf')
    if (!name.endsWith('.csv') && !pdfOk) {
      setError(t(SUPPORTED_FORMATS.pdf ? 'errors.invalidFileTypeCsvOrPdf' : 'errors.invalidFileTypeCsv'))
      return
    }
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
    if (!file) return
    const name = file.name.toLowerCase()
    const pdfOk = SUPPORTED_FORMATS.pdf && name.endsWith('.pdf')
    if (!name.endsWith('.htm') && !name.endsWith('.html') && !pdfOk) {
      setError(t(SUPPORTED_FORMATS.pdf ? 'errors.invalidFileTypeHtmlOrPdf' : 'errors.invalidFileTypeHtml'))
      return
    }
    setHtmlFile(file)
    setResult(null)
    setError(null)
  }

  function clearHtmlFile() {
    setHtmlFile(null)
    setResult(null)
    setError(null)
  }

  function updatePendingPosition(i, field, value) {
    setPendingPositions(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p))
  }

  function handleCalculate() {
    if (!inputData || !agreed) return

    setError(null)
    setResult(null)

    try {
      const priorPositions = (pendingPositions ?? []).map(p => ({
        symbol: p.symbol,
        currency: p.currency,
        qty: p.qty,
        costUSD: parseFloat(String(p.costUSDInput).replace(',', '.')) || 0,
        costLcl: parseFloat(String(p.costLclInput).replace(',', '.')) || 0,
        lastBuyDate: p.lastBuyDateInput || getPrevYearEndDate(taxYear),
      }))

      setResult(calculateTax(inputData, priorPositions, { strategy: costBasisStrategy }))
    } catch (e) {
      const msg = e.code
        ? t(`errors.${e.code.toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase())}`, e)
        : e.message
      setError(msg)
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
  const outputJsonText = result ? JSON.stringify(result, decimalJsonReplacer, 2) : ''

  return {
    nightMode, setNightMode,
    costBasisStrategy, setCostBasisStrategy,
    csvFile, csvFileUrl, isPdf,
    htmlFile, htmlFileUrl, isHtmlPdf,
    inputData, pendingPositions, result,
    parsing, error,
    taxYear, inputJsonText, outputJsonText,
    agreed, setAgreed,
    showTerms, setShowTerms,
    showPrivacy, setShowPrivacy,
    selectCsvFile, clearCsvFile,
    selectHtmlFile, clearHtmlFile,
    updatePendingPosition,
    handleCalculate,
    handleLoadDemo,
  }
}
