import { useState, useRef, useEffect } from 'react'
import { FiCheck, FiCopy, FiGithub, FiInfo, FiMail, FiUploadCloud, FiX } from 'react-icons/fi'
import { processFile } from './services/processFile.js'
import AboutSection from './content/AboutSection.jsx'
import TermsContent from './content/TermsContent.jsx'
import TradesTable from './components/TradesTable.jsx'
import OpenPositionsTable from './components/OpenPositionsTable.jsx'
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
    <button className={`copy-btn${copied ? ' copied' : ''}`} onClick={handleCopy} title="Копирай JSON">
      {copied ? <FiCheck size={16} aria-hidden="true" /> : <FiCopy size={16} aria-hidden="true" />}
    </button>
  )
}

function Modal({ onClose }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-header">
          <h2 id="modal-title">Условия за ползване</h2>
          <button className="modal-close" onClick={onClose} aria-label="Затвори">
            <FiX size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="modal-body">
          <TermsContent onClose={onClose} />
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [file, setFile] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [showTerms, setShowTerms] = useState(false)
  const inputRef = useRef(null)

  function selectFile(f) {
    if (!f) return
    setFile(f)
    setResult(null)
    setError(null)
  }

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

  function handleInputChange(e) { selectFile(e.target.files[0]) }
  function handleDrop(e) {
    e.preventDefault()
    selectFile(e.dataTransfer.files[0])
  }
  function handleDragOver(e) { e.preventDefault() }

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
          <div
            className="dropzone"
            onClick={() => inputRef.current.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              onChange={handleInputChange}
              style={{ display: 'none' }}
            />
            {file ? (
              <span className="file-name">{file.name}</span>
            ) : (
              <>
                <FiUploadCloud className="dropzone-icon" size={32} aria-hidden="true" />
                <span className="dropzone-label">Пуснете CSV тук или кликнете за избор</span>
              </>
            )}
          </div>

          <div className="action-bar">
            <label className="agree-label">
              <input
                type="checkbox"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
              />
              Съгласен/на съм с{' '}
              <button className="terms-inline-btn" onClick={() => setShowTerms(true)}>
                условията за ползване
              </button>
            </label>
            <button
              className="calc-btn"
              disabled={!file || !agreed || loading}
              onClick={handleCalculate}
            >
              {loading ? 'Изчислява се...' : 'Изчисли'}
            </button>
          </div>

          {error && <p className="status error">Грешка: {error}</p>}

          {result && (
            <>
              <TradesTable trades={result.trades} />
              <OpenPositionsTable holdings={result.holdings} />
              {DEV_MODE && (
                <div className="output">
                  <div className="output-header">
                    <span className="output-count">
                      JSON <span className="output-pill">{result.trades.length + result.holdings.length}</span>
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
        <hr></hr>
        <div className="footer-copy">
          © 2026 IBKR Данъчен калкулатор. Всички права запазени.
        </div>
      </footer>

      {showTerms && <Modal onClose={() => setShowTerms(false)} />}
    </div>
  )
}
