/**
 * Extracts the tax year from the IBKR Activity Statement CSV rows.
 * Looks for: Statement,Data,Period,"January 1, 2025 - December 31, 2025"
 *
 * Throws a Bulgarian-language error for unsupported years (before 2025).
 */
export function parseTaxYear(rows) {
  const row = rows.find(r => r[0] === 'Statement' && r[1] === 'Data' && r[2] === 'Period')
  if (!row) throw new Error('Не е намерен период на отчета в Statement секцията.')
  const period = (row[3] || '').trim()
  const m = period.match(/(\d{4})\s*$/)
  if (!m) throw new Error(`Неразпознат формат на период: ${period}`)
  const year = parseInt(m[1])
  if (year < 2025) {
    throw new Error(
      `Годината ${year} не се поддържа. Приложението поддържа отчети от 2025 г. насам.`
    )
  }
  return year
}
