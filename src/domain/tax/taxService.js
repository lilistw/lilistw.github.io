import { getTaxStrategy } from './strategyFactory.js'

export function calculateTax(parsedData, priorPositions = []) {
  const strategy = getTaxStrategy(parsedData.taxYear)
  return strategy.calculate(parsedData, priorPositions)
}
