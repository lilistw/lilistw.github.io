import { describe, it, expect } from 'vitest'
import { classifyInstrument, isTaxable, getInstrumentTypeLabel } from '../instrument/classifier.js'

describe('classifyInstrument', () => {
  it('detects ETF from name', () => {
    const c = classifyInstrument({ name: 'iShares Core MSCI World ETF', isRegulatedMarket: true })
    expect(c.isETF).toBe(true)
    expect(c.isCryptoRelated).toBe(false)
    expect(c.isRegulatedMarket).toBe(true)
  })

  it('detects ETF from type field when name has no "ETF" (e.g. IWDA)', () => {
    const c = classifyInstrument({ name: 'ISHARES CORE MSCI WORLD', type: 'ETF', isRegulatedMarket: true })
    expect(c.isETF).toBe(true)
    expect(c.isCryptoRelated).toBe(false)
  })

  it('does not treat non-ETF type as ETF', () => {
    const c = classifyInstrument({ name: 'SAP SE', type: 'COMMON', isRegulatedMarket: true })
    expect(c.isETF).toBe(false)
  })

  it('detects crypto ETF — BITCOIN in name', () => {
    const c = classifyInstrument({ name: 'iShares Bitcoin Trust ETF', isRegulatedMarket: true })
    expect(c.isETF).toBe(true)
    expect(c.isCryptoRelated).toBe(true)
  })

  it('detects crypto ETF — CRYPTO in name', () => {
    const c = classifyInstrument({ name: 'Global Crypto ETF', isRegulatedMarket: true })
    expect(c.isCryptoRelated).toBe(true)
  })

  it('detects crypto ETF — BTC in name', () => {
    const c = classifyInstrument({ name: 'ProShares BTC Strategy ETF', isRegulatedMarket: true })
    expect(c.isCryptoRelated).toBe(true)
  })

  it('detects crypto ETF — ETH in name', () => {
    const c = classifyInstrument({ name: 'Ether ETF Fund', isRegulatedMarket: true })
    expect(c.isCryptoRelated).toBe(true)
  })

  it('non-ETF stock is not ETF and not crypto', () => {
    const c = classifyInstrument({ name: 'Apple Inc', isRegulatedMarket: false })
    expect(c.isETF).toBe(false)
    expect(c.isCryptoRelated).toBe(false)
  })

  it('treats missing name as empty string', () => {
    const c = classifyInstrument({ isRegulatedMarket: false })
    expect(c.isETF).toBe(false)
    expect(c.isCryptoRelated).toBe(false)
  })

  it('isRegulatedMarket is false when not set', () => {
    const c = classifyInstrument({ name: 'Some ETF' })
    expect(c.isRegulatedMarket).toBe(false)
  })
})

describe('isTaxable', () => {
  it('standard ETF on regulated market → необлагаем (false)', () => {
    expect(isTaxable({ name: 'iShares Core MSCI World ETF', isRegulatedMarket: true })).toBe(false)
  })

  it('ETF detected by type (no "ETF" in name) on regulated market → необлагаем (false)', () => {
    // IWDA: description = "ISHARES CORE MSCI WORLD", type = "ETF", exchange = IBIS2 (regulated)
    expect(isTaxable({ name: 'ISHARES CORE MSCI WORLD', type: 'ETF', isRegulatedMarket: true })).toBe(false)
  })

  it('crypto ETF on regulated market → облагаем (true)', () => {
    expect(isTaxable({ name: 'iShares Bitcoin Trust ETF', isRegulatedMarket: true })).toBe(true)
  })

  it('ETF on non-regulated market → облагаем (true)', () => {
    expect(isTaxable({ name: 'iShares Core MSCI World ETF', isRegulatedMarket: false })).toBe(true)
  })

  it('regular stock → облагаем (true)', () => {
    expect(isTaxable({ name: 'Apple Inc', isRegulatedMarket: false })).toBe(true)
  })

  it('regular stock on regulated market → облагаем (true)', () => {
    expect(isTaxable({ name: 'SAP SE', isRegulatedMarket: true })).toBe(true)
  })

  it('unknown instrument (empty name) → облагаем (true)', () => {
    expect(isTaxable({ name: '', isRegulatedMarket: true })).toBe(true)
  })

  it('unknown instrument (no props) → облагаем (true)', () => {
    expect(isTaxable({})).toBe(true)
  })
})

describe('getInstrumentTypeLabel', () => {
  it('returns "ETF" for ETF by name', () => {
    expect(getInstrumentTypeLabel({ name: 'iShares Core MSCI World ETF' })).toBe('ETF')
  })

  it('returns "ETF" for ETF by type field (IWDA case)', () => {
    expect(getInstrumentTypeLabel({ name: 'ISHARES CORE MSCI WORLD', type: 'ETF' })).toBe('ETF')
  })

  it('returns "Stock" for COMMON type', () => {
    expect(getInstrumentTypeLabel({ name: 'Apple Inc', type: 'COMMON' })).toBe('Stock')
  })

  it('returns "Stock" for ADR type', () => {
    expect(getInstrumentTypeLabel({ name: 'Alibaba ADR', type: 'ADR' })).toBe('Stock')
  })

  it('returns "Stock" when type is empty', () => {
    expect(getInstrumentTypeLabel({ name: 'Unknown Corp', type: '' })).toBe('Stock')
  })

  it('returns "Other" for unrecognized type', () => {
    expect(getInstrumentTypeLabel({ name: 'Some Warrant', type: 'WARRANT' })).toBe('Other')
  })

  it('returns "Stock" for unknown instrument with no props', () => {
    expect(getInstrumentTypeLabel({})).toBe('Stock')
  })
})
