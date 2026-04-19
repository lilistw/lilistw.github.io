import { TaxStrategy2025 } from './strategies/TaxStrategy2025.js'
import { TaxStrategy2026 } from './strategies/TaxStrategy2026.js'

export function getTaxStrategy(taxYear) {
  if (taxYear === 2025) {
    return new TaxStrategy2025()
  }

  return new TaxStrategy2026()
}
