import {
  KeyValueSectionExtractor,
  TableSectionExtractor,
} from './SectionExtractorStrategy.js'

/**
 * Known IBKR Activity Statement section names and their extraction strategy.
 * Order matters: the adapter matches the first occurrence of each name in the text.
 */
const SECTION_REGISTRY = new Map([
  ['Statement',                     new KeyValueSectionExtractor()],
  ['Account Information',           new KeyValueSectionExtractor()],
  ['Financial Instrument Information', new TableSectionExtractor()],
  ['Open Positions',                new TableSectionExtractor()],
  ['Trades',                        new TableSectionExtractor()],
  ['Dividends',                     new TableSectionExtractor()],
  ['Withholding Tax',               new TableSectionExtractor()],
  ['Interest',                      new TableSectionExtractor()],
])

/**
 * Adapter — converts raw IBKR Activity Statement PDF text into string[][],
 * the same format PapaParse produces from the CSV equivalent.
 *
 * All existing downstream parsers (parseCsvTrades, parseDividends, …)
 * receive the adapted rows without any modification.
 */
export class PdfToCsvAdapter {
  /**
   * @param {string} text - full extracted PDF text (pages newline-joined)
   * @returns {string[][]}
   */
  adapt(text) {
    const lines = text.split('\n').map(l => l.trim())
    const sections = this.#splitIntoSections(lines)

    if (sections.size === 0) {
      throw new Error(
        'Невалиден PDF файл. Не са намерени познати секции от IBKR Activity Statement.',
      )
    }

    const allRows = []
    for (const [name, sectionLines] of sections) {
      const strategy = SECTION_REGISTRY.get(name)
      const rows = strategy.extract(name, sectionLines)
      allRows.push(...rows)
    }

    return allRows
  }

  /**
   * Walk the lines and collect non-blank body lines for each recognised section.
   *
   * @param {string[]} lines
   * @returns {Map<string, string[]>}
   */
  #splitIntoSections(lines) {
    const sections = new Map()
    let currentSection = null

    for (const line of lines) {
      if (!line) {
        continue
      }

      if (SECTION_REGISTRY.has(line)) {
        currentSection = line
        if (!sections.has(line)) sections.set(line, [])
        continue
      }

      if (currentSection !== null) {
        sections.get(currentSection).push(line)
      }
    }

    return sections
  }
}
