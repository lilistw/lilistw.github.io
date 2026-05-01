import { describe, it, expect } from 'vitest'
import { parseInstruments, buildInstrumentInfo, expandByAliases } from '../parseInstruments.js'

function makeRows(dataRows = []) {
  const header = [
    'Financial Instrument Information', 'Header',
    'Asset Category', 'Symbol', 'Description', 'Conid',
    'Security ID', 'Underlying', 'Listing Exch', 'Multiplier', 'Type', 'Code',
  ]
  return [header, ...dataRows]
}

function makeInstrumentRow(fields = {}) {
  return [
    'Financial Instrument Information', 'Data',
    fields.assetCategory    ?? 'Stocks',
    fields.symbol           ?? 'AAPL',
    fields.description      ?? 'Apple Inc',
    fields.conid            ?? '265598',
    fields.securityId       ?? 'US0378331005',
    fields.underlying       ?? '',
    fields.listingExchange  ?? 'NASDAQ',
    fields.multiplier       ?? '1',
    fields.type             ?? 'COMMON',
    fields.code             ?? '',
  ]
}

describe('parseInstruments', () => {
  it('returns empty array when no header exists', () => {
    expect(parseInstruments([])).toEqual([])
    expect(parseInstruments([['Dividends', 'Header']])).toEqual([])
  })

  it('parses a single instrument row', () => {
    const rows = makeRows([makeInstrumentRow()])
    const result = parseInstruments(rows)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      assetCategory:   'Stocks',
      symbol:          'AAPL',
      description:     'Apple Inc',
      conid:           '265598',
      securityId:      'US0378331005',
      listingExchange: 'NASDAQ',
      multiplier:      '1',
      type:            'COMMON',
    })
  })

  it('parses multiple instruments', () => {
    const rows = makeRows([
      makeInstrumentRow({ symbol: 'AAPL' }),
      makeInstrumentRow({ symbol: 'MSFT', description: 'Microsoft Corp', securityId: 'US5949181045' }),
    ])
    expect(parseInstruments(rows)).toHaveLength(2)
  })

  it('handles comma-separated symbol aliases in symbol field', () => {
    const rows = makeRows([
      makeInstrumentRow({ symbol: 'EXS1, EXS1d' }),
    ])
    const result = parseInstruments(rows)
    expect(result[0].symbol).toBe('EXS1, EXS1d')
  })
})

describe('buildInstrumentInfo', () => {
  it('returns empty object for empty instruments array', () => {
    expect(buildInstrumentInfo([])).toEqual({})
  })

  it('creates a symbol-keyed lookup from instruments', () => {
    const instruments = parseInstruments(makeRows([
      makeInstrumentRow({ symbol: 'AAPL', securityId: 'US0378331005', type: 'COMMON' }),
    ]))
    const info = buildInstrumentInfo(instruments)
    expect(info['AAPL']).toBeDefined()
    expect(info['AAPL'].type).toBe('COMMON')
    expect(info['AAPL'].securityId).toBe('US0378331005')
  })

  it('derives country code from ISIN prefix (first 2 chars of securityId)', () => {
    const instruments = parseInstruments(makeRows([
      makeInstrumentRow({ symbol: 'AAPL', securityId: 'US0378331005' }),
      makeInstrumentRow({ symbol: 'EXS1', securityId: 'IE00B4L5Y983', type: 'ETF', listingExchange: 'IBIS' }),
    ]))
    const info = buildInstrumentInfo(instruments)
    expect(info['AAPL'].country).toBe('US')
    expect(info['EXS1'].country).toBe('IE')
  })

  it('expands comma-separated aliases to separate keys', () => {
    const instruments = parseInstruments(makeRows([
      makeInstrumentRow({ symbol: 'EXS1, EXS1d', securityId: 'IE00B4L5Y983' }),
    ]))
    const info = buildInstrumentInfo(instruments)
    expect(info['EXS1']).toBeDefined()
    expect(info['EXS1d']).toBeDefined()
    expect(info['EXS1'].securityId).toBe('IE00B4L5Y983')
    expect(info['EXS1d'].securityId).toBe('IE00B4L5Y983')
  })

  it('stores all alias symbols in the aliases array', () => {
    const instruments = parseInstruments(makeRows([
      makeInstrumentRow({ symbol: 'EXS1, EXS1d' }),
    ]))
    const info = buildInstrumentInfo(instruments)
    expect(info['EXS1'].aliases).toContain('EXS1')
    expect(info['EXS1'].aliases).toContain('EXS1d')
  })
})

describe('expandByAliases', () => {
  it('returns the same dict when no aliases exist', () => {
    const dict = { AAPL: 100 }
    const instrumentInfo = { AAPL: { aliases: ['AAPL'] } }
    const result = expandByAliases(dict, instrumentInfo)
    expect(result['AAPL']).toBe(100)
  })

  it('adds alias keys pointing to the same value', () => {
    const dict = { EXS1: 200 }
    const instrumentInfo = { EXS1: { aliases: ['EXS1', 'EXS1d'] } }
    const result = expandByAliases(dict, instrumentInfo)
    expect(result['EXS1d']).toBe(200)
  })

  it('does not overwrite existing keys', () => {
    const dict = { EXS1: 200, EXS1d: 300 }
    const instrumentInfo = { EXS1: { aliases: ['EXS1', 'EXS1d'] } }
    const result = expandByAliases(dict, instrumentInfo)
    expect(result['EXS1d']).toBe(300)
  })

  it('does not mutate the original dict', () => {
    const dict = { EXS1: 200 }
    const instrumentInfo = { EXS1: { aliases: ['EXS1', 'EXS1d'] } }
    expandByAliases(dict, instrumentInfo)
    expect(dict['EXS1d']).toBeUndefined()
  })

  it('handles symbol not in instrumentInfo gracefully', () => {
    const dict = { UNKNOWN: 50 }
    const instrumentInfo = {}
    const result = expandByAliases(dict, instrumentInfo)
    expect(result['UNKNOWN']).toBe(50)
  })
})
