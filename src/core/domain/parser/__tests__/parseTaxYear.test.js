import { describe, it, expect } from 'vitest'
import { parseTaxYear } from '../parseTaxYear.js'

describe('parseTaxYear', () => {
  it('extracts year from standard IBKR period format', () => {
    expect(parseTaxYear('January 1, 2025 - December 31, 2025')).toBe(2025)
  })

  it('extracts year for future supported years', () => {
    expect(parseTaxYear('January 1, 2026 - December 31, 2026')).toBe(2026)
    expect(parseTaxYear('January 1, 2030 - December 31, 2030')).toBe(2030)
  })

  it('uses the trailing year (end of period)', () => {
    // The regex matches the last 4-digit number
    expect(parseTaxYear('January 1, 2025 - December 31, 2025')).toBe(2025)
  })

  it('throws for year before 2025', () => {
    expect(() => parseTaxYear('January 1, 2024 - December 31, 2024')).toThrow()
    expect(() => parseTaxYear('January 1, 2023 - December 31, 2023')).toThrow()
  })

  it('throws an error containing the unsupported year', () => {
    expect(() => parseTaxYear('January 1, 2024 - December 31, 2024')).toThrow('2024')
  })

  it('throws for unrecognized format', () => {
    expect(() => parseTaxYear('invalid period')).toThrow()
    expect(() => parseTaxYear('')).toThrow()
    expect(() => parseTaxYear(null)).toThrow()
    expect(() => parseTaxYear(undefined)).toThrow()
  })

  it('throws error with Bulgarian message for unsupported year', () => {
    expect(() => parseTaxYear('January 1, 2020 - December 31, 2020')).toThrow(
      /не се поддържа/
    )
  })

  it('throws error with Bulgarian message for unrecognized format', () => {
    expect(() => parseTaxYear('bad format')).toThrow(/Неразпознат формат/)
  })
})
