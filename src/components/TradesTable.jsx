import { useState } from 'react'

const PREVIEW_ROWS = 5

function fmt(n, decimals = 2) {
  return Number(n).toLocaleString('bg-BG', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export default function TradesTable({ trades }) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? trades : trades.slice(0, PREVIEW_ROWS)
  const hidden = trades.length - PREVIEW_ROWS

  return (
    <div className="trades-wrap">
      <div className="trades-header">
        <span className="output-count">
          Сделки <span className="output-pill">{trades.length}</span>
        </span>
      </div>

      <div className="trades-scroll">
        <table className="trades-table">
          <thead>
            <tr>
              <th>Дата</th>
              <th>Символ</th>
              <th>Тип</th>
              <th>Валута</th>
              <th className="num">Количество</th>
              <th className="num">Цена</th>
              <th className="num">Такса</th>
              <th className="num">Постъпления</th>
              <th className="num">Реализирана П/З</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((t, i) => (
              <tr key={i}>
                <td className="mono">{t.date}</td>
                <td><strong>{t.symbol}</strong></td>
                <td>
                  <span className={`type-badge type-badge--${t.type.toLowerCase()}`}>{t.type}</span>
                </td>
                <td>{t.currency}</td>
                <td className="num mono">{fmt(t.quantity, 4)}</td>
                <td className="num mono">{fmt(t.price, 4)}</td>
                <td className="num mono">{fmt(t.fee, 4)}</td>
                <td className="num mono">{fmt(t.proceeds)}</td>
                <td className={`num mono pnl ${t.realizedPL > 0 ? 'pnl--pos' : t.realizedPL < 0 ? 'pnl--neg' : ''}`}>
                  {t.realizedPL !== 0 ? fmt(t.realizedPL) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {trades.length > PREVIEW_ROWS && (
        <button className="trades-expand-btn" onClick={() => setExpanded(e => !e)}>
          {expanded
            ? 'Скрий'
            : `Покажи всички ${hidden} скрити сделки`}
        </button>
      )}
    </div>
  )
}
