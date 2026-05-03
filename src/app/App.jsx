import { t, setLanguage } from './localization/i18n.js'
import { getStoredLanguage, storeLanguage } from './hooks/languageStorage.js'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { Box, Button, Checkbox, FormControlLabel, Typography, Link, Alert } from '@mui/material'
import { useState, useEffect } from 'react'

import { dayTheme, nightTheme } from './theme.js'
import { useTaxAppController } from './hooks/useTaxAppController.js'

import AppHeader from './components/AppHeader.jsx'
import AppFooter from './components/AppFooter.jsx'
import Disclaimer from './components/Disclaimer.jsx'
import InfoModal from './components/InfoModal.jsx'
import Dropzone from './components/Dropzone.jsx'
import ResultTabs from './components/ResultTabs/ResultTabs.jsx'
import PriorYearPositionsForm from './components/PriorYearPositionsForm.jsx'
import CostBasisStrategySelector from './components/CostBasisStrategySelector.jsx'

export default function App() {
  const [, setRerenderTrigger] = useState(0)

  // Initialize language on app load
  useEffect(() => {
    const storedLanguage = getStoredLanguage()
    const initialLanguage = storedLanguage || 'bg'
    setLanguage(initialLanguage)
    storeLanguage(initialLanguage)
  }, [])

  // Listen for language changes from language toggle button
  useEffect(() => {
    const handleLanguageChange = (event) => {
      const newLanguage = event.detail
      storeLanguage(newLanguage)
      setRerenderTrigger(prev => prev + 1)
    }
    window.addEventListener('languageChanged', handleLanguageChange)
    return () => window.removeEventListener('languageChanged', handleLanguageChange)
  }, [])

  const {
    nightMode, setNightMode,
    costBasisStrategy, setCostBasisStrategy,
    csvFile, csvFileUrl,
    htmlFile, htmlFileUrl,
    inputData, pendingPositions, result,
    parsing, error,
    taxContext, inputJsonText, outputJsonText,
    agreed, setAgreed,
    showTerms, setShowTerms,
    showPrivacy, setShowPrivacy,
    selectCsvFile, clearCsvFile,
    selectHtmlFile, clearHtmlFile,
    updatePendingPosition,
    handleCalculate,
    handleLoadDemo,
  } = useTaxAppController()

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
                  accept=".csv,text/csv"
                  label={t('dropzone.csvLabel')}
                  infoKey="csv"
                  fileType={csvFile ? 'CSV' : undefined}
                  hint={t('app.csvHint')}
                />
              </Box>
              <Box>
                <Dropzone
                  file={htmlFile} fileUrl={htmlFileUrl}
                  onFileSelect={selectHtmlFile} onClearFile={clearHtmlFile}
                  accept=".htm,.html"
                  label={t('dropzone.htmlLabel')}
                  infoKey="htm"
                  fileType={htmlFile ? 'HTML' : undefined}
                  hint={t('app.htmlHint')}
                />
              </Box>
            </Box>

            {/* Terms + Calculate button */}
            {csvFile && htmlFile && !result && (
              <Box sx={{
                mb: 1, px: 2, py: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 2, mt: 1, flexWrap: 'wrap',
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

            {/* Prior-year positions form */}
            {!result && pendingPositions !== null && pendingPositions.length > 0 && (
              <PriorYearPositionsForm
                positions={pendingPositions}
                onPositionChange={updatePendingPosition}
                taxContext={taxContext}
              />
            )}

            {/* Cost basis strategy */}
            {!result && inputData && (
              <CostBasisStrategySelector
                value={costBasisStrategy}
                onChange={setCostBasisStrategy}
              />
            )}

            {/* Demo load button */}
            {(!csvFile || !htmlFile) && (
              <Box sx={{
                mb: 1, px: 2, py: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 1, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.04)',
              }}>
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

        <AppFooter onShowTerms={() => setShowTerms(true)} onShowPrivacy={() => setShowPrivacy(true)} />

        {showTerms && <InfoModal titleKey="terms.title" sectionsKey="terms.sections" onClose={() => setShowTerms(false)} />}
        {showPrivacy && <InfoModal titleKey="privacy.title" sectionsKey="privacy.sections" onClose={() => setShowPrivacy(false)} />}
      </div>
    </ThemeProvider>
  )
}
