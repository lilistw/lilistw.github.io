import Decimal from 'decimal.js'

export const D0 = new Decimal(0)

/**
 * Parse a raw numeric string (may contain commas) to a Decimal.
 * Returns null for blank / non-numeric input.
 */
export function parseToDecimal(rawStr) {
  if (rawStr == null) return null
  const cleaned = String(rawStr).replace(/,/g, '').trim()
  if (cleaned === '' || cleaned === '-' || cleaned === '+') return null
  try {
    return new Decimal(cleaned)
  } catch {
    return null
  }
}

/**
 * Convert a Decimal (or number/string coercible to Decimal) to a display
 * string with trailing zeros stripped.
 *
 *   "186.5000" → "186.5"
 *   "190.0000" → "190"
 *   "-2,238.00" → "-2238"    (commas removed, zeros stripped)
 *   "1.80"     → "1.8"
 *   "3"        → "3"
 */
export function toDisplayStr(value) {
  if (value == null) return null
  const d = value instanceof Decimal
    ? value
    : new Decimal(String(value).replace(/,/g, ''))
  // toFixed() gives fixed-point notation; then strip trailing zeros
  const s = d.toFixed()
  if (!s.includes('.')) return s
  return s.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')
}
