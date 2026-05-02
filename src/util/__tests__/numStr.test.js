import { describe, it, expect } from 'vitest'
import Decimal from 'decimal.js'
import { toDecimal, decimalToNumber, D0 } from '@util/numStr.js'

describe('toDecimal', () => {
  it('passes Decimal through unchanged', () => {
    const d = new Decimal('1')
    expect(toDecimal(d)).toBe(d)
  })

  it('wraps a string', () => {
    expect(toDecimal('1.5')).toEqual(new Decimal('1.5'))
  })

  it('wraps a number', () => {
    expect(toDecimal(2)).toEqual(new Decimal(2))
  })

  it('handles null → D0', () => {
    expect(toDecimal(null)).toEqual(D0)
  })

  it('handles undefined → D0', () => {
    expect(toDecimal(undefined)).toEqual(D0)
  })

  it('handles comma-formatted string', () => {
    expect(toDecimal('1,500')).toEqual(new Decimal(1500))
  })

  it('handles invalid string → D0', () => {
    expect(toDecimal('abc')).toEqual(D0)
  })
})

describe('decimalToNumber', () => {
  it('converts Decimal to number', () => {
    expect(decimalToNumber(new Decimal('1.5'))).toBe(1.5)
  })

  it('passes number through unchanged', () => {
    expect(decimalToNumber(3)).toBe(3)
  })

  it('returns null for null', () => {
    expect(decimalToNumber(null)).toBeNull()
  })

  it('returns null for undefined', () => {
    expect(decimalToNumber(undefined)).toBeNull()
  })
})
