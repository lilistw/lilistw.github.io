import { describe, it, expect } from 'vitest'
import { parseInput } from '../parseInput.js'

describe('parseInput', () => {
  it('should parse input correctly', () => {
    const mockActivityStatement = [
      ['Statement', 'Data', 'Period', 'January 1, 2025 - December 31, 2025'],
      ['Trades', ''],
      ['Header', 'AssetCategory', 'Currency', 'Symbol', 'Quantity', 'TradePrice', 'TradeDate', 'SettleDate', 'TradeTime', 'Comm/Fee', 'Basis', 'RealizedP&L', 'MTMPnL', 'Code'],
      ['Data', 'Stocks', 'USD', 'AAPL', '10', '150.00', '2025-01-15', '2025-01-17', '', '-1.00', '', '', '', '']
    ]
    const mockTradeConfirmation = []
    
    const result = parseInput({ activityStatement: mockActivityStatement, tradeConfirmation: mockTradeConfirmation })

    expect(result).toBeDefined()
    expect(result.taxContext.taxYear).toBe(2025)
    expect(result.openPositions).toBeDefined()
  })

  it('should parse input with trade confirmations', () => {
    const mockActivityStatement = [
      ['Statement', 'Data', 'Period', 'January 1, 2025 - December 31, 2025'],
      ['Trades', ''],
      ['Header', 'AssetCategory', 'Currency', 'Symbol', 'Quantity', 'TradePrice', 'TradeDate', 'SettleDate', 'TradeTime', 'Comm/Fee', 'Basis', 'RealizedP&L', 'MTMPnL', 'Code'],
      ['Data', 'Stocks', 'USD', 'AAPL', '10', '150.00', '2025-01-15', '2025-01-17', '', '-1.00', '', '', '', '']
    ]
    const mockTradeConfirmation = [
      {
        symbol: 'AAPL',
        description: 'Apple Inc',
        quantity: 10,
        price: 150.00,
        tradeDate: '2025-01-15',
        settleDate: '2025-01-17',
        commission: 1.00,
        proceeds: 1500.00
      }
    ]
    
    const result = parseInput({ activityStatement: mockActivityStatement, tradeConfirmation: mockTradeConfirmation })

    expect(result).toBeDefined()
    expect(result.taxContext.taxYear).toBe(2025)
    expect(result.trades).toHaveLength(1)
    expect(result.trades[0].symbol).toBe('AAPL')
  })

  it('should parse dividends', () => {
    const mockActivityStatement = [
      ['Statement', 'Data', 'Period', 'January 1, 2025 - December 31, 2025'],
      ['Dividends', 'Header', 'Currency', 'Date', 'Description', 'Amount'],
      ['Dividends', 'Data', 'USD', '2025-02-01', 'AAPL dividend', '2.50']
    ]
    const mockTradeConfirmation = []

    const result = parseInput({ activityStatement: mockActivityStatement, tradeConfirmation: mockTradeConfirmation })

    expect(result).toBeDefined()
    expect(result.dividends).toBeDefined()
    expect(result.dividends).toHaveLength(1)
  })

  it('should parse interest', () => {
    const mockActivityStatement = [
      ['Statement', 'Data', 'Period', 'January 1, 2025 - December 31, 2025'],
      ['Interest', 'Header', 'Currency', 'Date', 'Description', 'Amount'],
      ['Interest', 'Data', 'USD', '2025-03-01', 'Interest', '5.00']
    ]
    const mockTradeConfirmation = []

    const result = parseInput({ activityStatement: mockActivityStatement, tradeConfirmation: mockTradeConfirmation })

    expect(result).toBeDefined()
    expect(result.interest).toBeDefined()
    expect(result.interest).toHaveLength(1)
  })

  it('should parse open positions', () => {
    const mockActivityStatement = [
      ['Statement', 'Data', 'Period', 'January 1, 2025 - December 31, 2025'],
      ['Open Positions', 'Header', 'DataDiscriminator', 'Asset Category', 'Currency', 'Symbol', 'Quantity', 'Mult', 'Cost Price', 'Cost Basis', 'Close Price', 'Value', 'Unrealized P/L', 'Code'],
      ['Open Positions', 'Data', 'Summary', 'Stocks', 'USD', 'AAPL', '10', '1', '150.00', '1500.00', '180.00', '1800.00', '300.00', '']
    ]
    const mockTradeConfirmation = []

    const result = parseInput({ activityStatement: mockActivityStatement, tradeConfirmation: mockTradeConfirmation })

    expect(result).toBeDefined()
    expect(result.openPositions).toBeDefined()
    expect(result.openPositions).toHaveLength(1)
    expect(result.openPositions[0].symbol).toBe('AAPL')
  })
})