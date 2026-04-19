import { TaxCalculator } from './TaxCalculator.js'

export function calculateTax(parsedData, priorPositions = []) {
  const strategy = new TaxCalculator();
  return strategy.calculate(parsedData, priorPositions)
}
