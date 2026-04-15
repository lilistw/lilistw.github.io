import { useState } from 'react'

const PREVIEW_ROWS = 5

function fmt(n, decimals = 2) {
  return Number(n).toLocaleString('bg-BG', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export default function OpenPositionsTable({ holdings }) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? holdings : holdings.slice(0, PREVIEW_ROWS)
  const hidden = holdings.length - PREVIEW_ROWS

  return (
    <div className="trades-wrap">
      <div className="trades-header">
        <span className="output-count">
          Позиции <span className="output-pill">{holdings.length}</span>
        </span>
      </div>

      <div className="trades-scroll">
        <table className="trades-table">
          <thead>
            <tr>
              <th>Символ</th>
              <th>Категория</th>
              <th>Валута</th>
              <th className="num">Количество</th>
              <th className="num">Множител</th>
              <th className="num">Цена</th>
              <th className="num">База</th>
              <th className="num">Крайнa</th>
              <th className="num">Стойност</th>
              <th className="num">Нереализирана P/L</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((h, i) => (
              <tr key={i}>
                <td><strong>{h.symbol}</strong></td>
                <td>{h.assetCategory}</td>
                <td>{h.currency}</td>
                <td className="num mono">{fmt(h.quantity, 4)}</td>
                <td className="num mono">{fmt(h.multiplier, 2)}</td>
                <td className="num mono">{fmt(h.costPrice, 4)}</td>
                <td className="num mono">{fmt(h.costBasis, 2)}</td>
                <td className="num mono">{fmt(h.closePrice, 4)}</td>
                <td className="num mono">{fmt(h.value, 2)}</td>
                <td className={`num mono pnl ${h.unrealizedPL > 0 ? 'pnl--pos' : h.unrealizedPL < 0 ? 'pnl--neg' : ''}`}>
                  {h.unrealizedPL !== null ? fmt(h.unrealizedPL) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {holdings.length > PREVIEW_ROWS && (
        <button className="trades-expand-btn" onClick={() => setExpanded(e => !e)}>
          {expanded
            ? 'Скрий'
            : `Покажи всички ${hidden} скрити позиции`}
        </button>
      )}
    </div>
  )
}
