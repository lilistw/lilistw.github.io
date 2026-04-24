import { WeightedAverageCostBasisStrategy } from './WeightedAverageCostBasisStrategy.js'
import { IbkrCostBasisStrategy } from './IbkrCostBasisStrategy.js'

export function createCostBasisStrategy(name, deps) {
  if (name === 'ibkr') return new IbkrCostBasisStrategy(deps)
  return new WeightedAverageCostBasisStrategy(deps)
}
