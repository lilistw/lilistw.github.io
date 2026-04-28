/**
 * Extracts the tax year from a period string.
 * Example input: "January 1, 2025 - December 31, 2025"
 *
 * Throws a Bulgarian-language error for unsupported years (before 2025).
 *
 * @param {string} period
 * @returns {number}
 */
export function parseTaxYear(period) {
  const m = (period || '').match(/(\d{4})\s*$/)
  if (!m) throw new Error(`Неразпознат формат на период: ${period}`)
  const year = parseInt(m[1])
  if (year < 2025) {
    throw new Error(
      `Годината ${year} не се поддържа. Приложението поддържа отчети от 2025 г. насам.`
    )
  }
  return year
}
