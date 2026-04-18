import CopyButton from './CopyButton'

export default function DevTab({ inputJsonText, outputJsonText }) {
  return (
    <>
      <div className="output" style={{ marginBottom: 24 }}>
        <div className="output-header">
          <span className="output-count">Input JSON</span>
          <CopyButton text={inputJsonText} />
        </div>

        <pre className="json-output">
          {inputJsonText}
        </pre>
      </div>

      <div className="output">
        <div className="output-header">
          <span className="output-count">Output JSON</span>
          <CopyButton text={outputJsonText} />
        </div>

        <pre className="json-output">
          {outputJsonText}
        </pre>
      </div>
    </>
  )
}