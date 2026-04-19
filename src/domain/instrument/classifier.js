// Heuristic instrument classification — intentionally simple.
// Default is conservative: облагаем (taxable) if classification is uncertain.

export function classifyInstrument(instrument) {
  const name = (instrument.name || '').toUpperCase()

  const isETF = name.includes('ETF')
  const isCryptoRelated =
    name.includes('BITCOIN') ||
    name.includes('CRYPTO') ||
    name.includes('BTC') ||
    name.includes('ETH')

  return {
    isETF,
    isCryptoRelated,
    isRegulatedMarket: instrument.isRegulatedMarket === true,
  }
}

// Returns true (облагаем) for everything except non-crypto ETFs on regulated EU/EEA markets.
export function isTaxable(instrument) {
  const c = classifyInstrument(instrument)

  if (c.isETF && c.isRegulatedMarket && !c.isCryptoRelated) {
    return false
  }

  return true
}
