import {
  buildInputData,
} from '../parser/buildInputData.js'

/**
 * Parse pre-read content into InputData. All inputs are plain data — no File or browser APIs.
 *
 * @param
 * @returns {InputData}
 */
export function parseInput({ activityStatement, tradeConfirmation }) {
  return buildInputData({ activityStatement, tradeConfirmation })
}
