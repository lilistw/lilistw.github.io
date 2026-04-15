import { useState, useRef, useEffect } from 'react'
import { processFile } from './services/processFile.js'
import TermsContent from './content/TermsContent.jsx'
import TradesTable from './components/TradesTable.jsx'
import './App.css'

const DEV_MODE = false

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button className={`copy-btn${copied ? ' copied' : ''}`} onClick={handleCopy} title="Копирай JSON">
      {copied ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="5" y="5" width="8" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v7A1.5 1.5 0 0 0 3.5 12H5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      )}
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
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <div className="modal-body">
          <TermsContent />
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
        <section className="about">
          <div className="about-card about-card--green">
            <div className="about-card-icon">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M4 4h8l4 4v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
                <path d="M12 4v4h4M7 11h6M7 14h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </div>
            <h2>За какво служи</h2>
            <p>Обработва Activity Statement от IBKR и изчислява облагаемите доходи от акции за годишната данъчна декларация.</p>
          </div>

          <div className="about-card about-card--indigo">
            <div className="about-card-icon">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <rect x="2" y="2" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.6"/>
                <path d="M6 14l3-4 2.5 2L15 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2>Метод</h2>
            <p>Среднопретеглена цена на придобиване по символ с конвертиране в BGN по курс на БНБ за датата на всяка сделка.</p>
          </div>

          <div className="about-card about-card--amber">
            <div className="about-card-icon">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M10 2l1.8 5.4H17l-4.5 3.3 1.7 5.3L10 13l-4.2 3 1.7-5.3L3 7.4h5.2L10 2z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2>Поверителност</h2>
            <p>Всичко се изпълнява в браузъра ви. Никакви данни не се качват или съхраняват.</p>
          </div>
        </section>

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
                <svg className="dropzone-icon" width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M12 16V8M8 12l4-4 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M20 16.5A3.5 3.5 0 0 0 16.5 13H15a5 5 0 1 0-9.9 1A4 4 0 1 0 6 21h13a3 3 0 0 0 1-5.5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
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
              {DEV_MODE && (
                <div className="output">
                  <div className="output-header">
                    <span className="output-count">
                      JSON <span className="output-pill">{result.trades.length}</span>
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
        <a href="https://github.com/" target="_blank" rel="noopener noreferrer" className="footer-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
          </svg>
          GitHub
        </a>
        <span className="footer-sep">·</span>
        <a href="mailto:lili.st.work@gmail.com" className="footer-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="1.6"/>
            <path d="M2 7l10 7 10-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
          Контакти
        </a>
        <span className="footer-sep">·</span>
        <button className="footer-link footer-btn" onClick={() => setShowTerms(true)}>
          Условия за ползване
        </button>
        <hr></hr>
        © 2026 IBKR Данъчен калкулатор. Всички права запазени.
      </footer>

      {showTerms && <Modal onClose={() => setShowTerms(false)} />}
    </div>
  )
}
