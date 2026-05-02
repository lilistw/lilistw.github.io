// Heuristic instrument classification — intentionally simple.
// Default is conservative: облагаем (taxable) if classification is uncertain.

const keywords = ['BITCOIN', 'CRYPTO', 'BTC', 'ETH']

export function classifyInstrument(instrument) {
  if (!instrument) return { isETF: false, isCryptoRelated: false, isRegulatedMarket: false }
  const isETF = (instrument.type || '').toUpperCase() === 'ETF'
  const instrumentName = instrument.name?.toUpperCase() || false;
  const isCryptoRelated = instrumentName && keywords.some(k => instrumentName.includes(k))

  return {
    isETF,
    isCryptoRelated,
    isRegulatedMarket: instrument.isRegulatedMarket === true,
  }
}

// Returns 'ETF', 'Stock', or 'Other' for display in UI tables.
export function getInstrumentTypeLabel(instrument) {
  const { isETF } = classifyInstrument(instrument)
  if (isETF) return 'ETF'
  const t = (instrument?.type || '').toUpperCase()
  if (!t || t === 'COMMON' || t === 'STOCK' || t === 'ADR' || t === 'REIT') return 'Stock'
  return 'Other'
}

// Returns true (облагаем) for everything except non-crypto ETFs on regulated EU/EEA markets.
export function isTaxable(instrument) {
  const c = classifyInstrument(instrument)

  if (c.isETF && c.isRegulatedMarket && !c.isCryptoRelated) {
    return false
  }

  return true
}
