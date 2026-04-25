/**
 * Base strategy for extracting an IBKR section from PDF text lines.
 * Concrete strategies produce string[][] rows in the same format as PapaParse output,
 * keyed on [sectionName, "Header"|"Data", ...columns].
 */
export class SectionExtractorStrategy {
  /**
   * @param {string}   sectionName  - IBKR section name (e.g. "Trades")
   * @param {string[]} lines        - non-blank lines belonging to this section
   * @returns {string[][]}
   */
  // eslint-disable-next-line no-unused-vars
  extract(sectionName, lines) {
    throw new Error('extract() must be implemented by a concrete strategy')
  }
}

/**
 * Strategy for tabular IBKR sections (Trades, Dividends, Open Positions, …).
 *
 * Expects:
 *   line 0 — column headers, space-delimited
 *   lines 1..n — data rows, space-delimited
 *
 * Emits:
 *   [sectionName, "Header", col1, col2, ...]
 *   [sectionName, "Data",   val1, val2, ...]
 */
export class TableSectionExtractor extends SectionExtractorStrategy {
  extract(sectionName, lines) {
    if (lines.length === 0) return []

    const rows = []
    const headerCols = splitLine(lines[0])
    rows.push([sectionName, 'Header', ...headerCols])

    for (let i = 1; i < lines.length; i++) {
      const cols = splitLine(lines[i])
      if (cols.length > 0) rows.push([sectionName, 'Data', ...cols])
    }

    return rows
  }
}

/**
 * Strategy for key-value IBKR sections (Statement, Account Information).
 *
 * Expects lines of the form "Key   Value" (separated by 2+ spaces).
 *
 * Emits:
 *   [sectionName, "Data", key, value]
 */
export class KeyValueSectionExtractor extends SectionExtractorStrategy {
  extract(sectionName, lines) {
    return lines
      .map(line => {
        const [key, ...rest] = line.split(/\s{2,}/)
        const value = rest.join('  ').trim()
        return key.trim() ? [sectionName, 'Data', key.trim(), value] : null
      })
      .filter(Boolean)
  }
}

/** Split a line by two-or-more spaces, trimming each token. */
function splitLine(line) {
  return line.split(/\s{2,}/).map(s => s.trim()).filter(Boolean)
}
