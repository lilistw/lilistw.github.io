import { describe, it, expect } from 'vitest'
import { parseStatementInfo } from '../parseStatementInfo.js'

function makeStatementRows(overrides = {}) {
  const defaults = {
    BrokerName:    'Interactive Brokers LLC',
    BrokerAddress: '1 Pickwick Plaza, Greenwich, CT 06830',
    Title:         'Activity Statement',
    Period:        'January 1, 2025 - December 31, 2025',
    WhenGenerated: '2026-01-15 10:00:00',
  }
  const values = { ...defaults, ...overrides }
  return Object.entries(values).map(([key, val]) => ['Statement', 'Data', key, val])
}

function makeAccountRows(overrides = {}) {
  const defaults = {
    Name:           'John Doe',
    Account:        'U1234567',
    'Account Type': 'Individual',
    'Customer Type': 'Individual',
    Capabilities:  'Trading',
    'Base Currency': 'USD',
  }
  const values = { ...defaults, ...overrides }
  return Object.entries(values).map(([key, val]) => ['Account Information', 'Data', key, val])
}

describe('parseStatementInfo', () => {
  it('extracts all statement fields correctly', () => {
    const rows = makeStatementRows()
    const { statement } = parseStatementInfo(rows)
    expect(statement).toMatchObject({
      brokerName:    'Interactive Brokers LLC',
      brokerAddress: '1 Pickwick Plaza, Greenwich, CT 06830',
      title:         'Activity Statement',
      period:        'January 1, 2025 - December 31, 2025',
      generatedAt:   '2026-01-15 10:00:00',
    })
  })

  it('extracts all account fields correctly', () => {
    const rows = makeAccountRows()
    const { account } = parseStatementInfo(rows)
    expect(account).toMatchObject({
      name:         'John Doe',
      accountId:    'U1234567',
      accountType:  'Individual',
      customerType: 'Individual',
      capabilities: 'Trading',
      baseCurrency: 'USD',
    })
  })

  it('returns empty strings for missing statement fields', () => {
    const { statement } = parseStatementInfo([])
    expect(statement.brokerName).toBe('')
    expect(statement.period).toBe('')
    expect(statement.generatedAt).toBe('')
  })

  it('returns empty strings for missing account fields', () => {
    const { account } = parseStatementInfo([])
    expect(account.name).toBe('')
    expect(account.accountId).toBe('')
    expect(account.baseCurrency).toBe('')
  })

  it('ignores rows from other sections', () => {
    const rows = [
      ...makeStatementRows(),
      ['Trades', 'Data', 'BrokerName', 'Should be ignored'],
    ]
    const { statement } = parseStatementInfo(rows)
    expect(statement.brokerName).toBe('Interactive Brokers LLC')
  })

  it('trims whitespace from values', () => {
    const rows = [['Statement', 'Data', 'BrokerName', '  Interactive Brokers LLC  ']]
    const { statement } = parseStatementInfo(rows)
    expect(statement.brokerName).toBe('Interactive Brokers LLC')
  })

  it('parses mixed statement and account rows together', () => {
    const rows = [...makeStatementRows(), ...makeAccountRows()]
    const { statement, account } = parseStatementInfo(rows)
    expect(statement.brokerName).toBe('Interactive Brokers LLC')
    expect(account.accountId).toBe('U1234567')
  })
})
