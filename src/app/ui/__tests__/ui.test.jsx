// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import React from 'react'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import AppHeader from '../AppHeader.jsx'
import ThresholdWarning from '../ThresholdWarning.jsx'

vi.mock('../../localization/i18n.js', () => ({
  t: (key, params) => {
    if (key === 'spb8Warning.details') return ['a', 'b']
    if (key === 'spb8Warning.totalLine') return `Total ${params.total} ${params.currency}`
    return key
  },
}))


vi.mock('../AboutSection.jsx', () => ({ default: () => null }))
function render(ui) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => root.render(ui))
  return { container, root }
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('UI components', () => {
  it('AppHeader toggles night mode from click', () => {
    const setNightMode = vi.fn()
    const { container } = render(<AppHeader nightMode={false} setNightMode={setNightMode} />)

    const toggle = container.querySelector('.app-header > div')
    act(() => toggle.dispatchEvent(new MouseEvent('click', { bubbles: true })))

    expect(setNightMode).toHaveBeenCalledTimes(1)
    const updater = setNightMode.mock.calls[0][0]
    expect(updater(false)).toBe(true)
    expect(updater(true)).toBe(false)
  })

  it('ThresholdWarning renders only above EUR 25,000 equivalent', () => {
    const low = render(<ThresholdWarning holdings={[{ costLcl: '1000' }]} localCurrencyLabel="BGN" localCurrencyCode="BGN" />)
    expect(low.container.textContent).toBe('')

    low.root.unmount()

    const high = render(
      <ThresholdWarning
        holdings={[{ costLcl: '50000' }, { costLcl: '10000' }]}
        localCurrencyLabel="BGN"
        localCurrencyCode="BGN"
      />
    )

    expect(high.container.textContent).toContain('spb8Warning.title')
    expect(high.container.textContent).toContain('Total')
    high.root.unmount()
  })
})
