/**
 * Extracts IBKR Activity Statement PDF page data into string[][] rows,
 * matching the format that PapaParse produces from the CSV Activity Statement.
 *
 * Unlike the previous coordinate-based adapter, column positions are detected
 * dynamically from the PDF column-header rows rather than hardcoded pixel ranges.
 * Each section's data rows are assigned to columns by nearest-anchor matching.
 */
export class PdfTableExtractor {
  /** @param {import('../../../../platform/web/readPdf.js').PdfPage[]} pages @returns {string[][]} */
  adapt(pages) {
    if (!pages || pages.length === 0) throw Object.assign(new Error('INVALID_PDF_FORMAT'), { code: 'INVALID_PDF_FORMAT' })

    const colMid = (pages[0]?.colWidth ?? 792) / 2
    const rows = [
      ...this.#extractStatement(pages[0]),
      ...this.#extractAccountInfo(pages),
      ...this.#extractOpenPositions(pages),
      ...this.#extractTrades(pages),
      ...this.#extractRightColumn(pages, colMid),
      ...this.#extractInterest(pages),
      ...this.#extractFii(pages),
    ]

    if (!rows.some(r => r[0] === 'Statement' && r[1] === 'Data'))
      throw Object.assign(new Error('INVALID_PDF_FORMAT'), { code: 'INVALID_PDF_FORMAT' })

    return rows
  }

  // ---------------------------------------------------------------------------
  // Core table-extraction helpers
  // ---------------------------------------------------------------------------

  /** Returns the x-position of each item in a header row (column anchors). */
  #detectColumns(headerItems) {
    return headerItems.map(item => item.col)
  }

  /**
   * Assigns items from a data row to the nearest column anchor.
   * Items further than `tolerance` pixels from every anchor are ignored.
   * Multiple items assigned to the same column are joined with a space.
   */
  #assignToColumns(rowItems, colPositions, tolerance = 40) {
    const cells = new Array(colPositions.length).fill('')
    for (const item of rowItems) {
      let best = -1, bestDist = Infinity
      for (let i = 0; i < colPositions.length; i++) {
        const d = Math.abs(item.col - colPositions[i])
        if (d < bestDist) { bestDist = d; best = i }
      }
      if (best >= 0 && bestDist <= tolerance)
        cells[best] = cells[best] ? `${cells[best]} ${item.str}` : item.str
    }
    return cells
  }

  // ---------------------------------------------------------------------------
  // Statement — synthesised from page-1 header (unchanged from original)
  // ---------------------------------------------------------------------------

  #extractStatement(page) {
    if (!page) return []

    const colMid = page.colWidth / 2

    // Collect all items from the top 200 rows (full width, both columns).
    // The Irish entity's PDF has Trade Confirmation cross-reference text in the
    // top-right at row < 100 — expanding the scan window and anchoring the period
    // search to the "Activity Statement" item avoids picking up the wrong values.
    const topItems = []
    for (const row of page.rows) {
      if (row.row >= 200) break
      for (const item of row.items)
        topItems.push({ row: row.row, col: item.col, str: item.str })
    }

    // Find "Activity Statement" to determine which side of the page the header is on.
    const actItem = topItems.find(i => /^activity statement/i.test(i.str))
    const actRow  = actItem?.row ?? -1
    const actSide = (actItem?.col ?? 0) >= colMid ? 'right' : 'left'

    // Group items by row so we can reconstruct per-row text strings.
    const rowMap = new Map()
    for (const i of topItems) {
      if (!rowMap.has(i.row)) rowMap.set(i.row, { left: [], right: [] })
      rowMap.get(i.row)[i.col >= colMid ? 'right' : 'left'].push(i.str)
    }
    const sortedRowKeys = [...rowMap.keys()].sort((a, b) => a - b)

    // Locate the period: look for a month+year pattern on the same side as the
    // title, within ±40 rows of it.  Fall back to a full-page scan if not found.
    const monthRe = /^(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d/
    let period = ''
    const rowMin = actRow >= 0 ? actRow - 20 : 0
    const rowMax = actRow >= 0 ? actRow + 40 : 200
    for (const rk of sortedRowKeys) {
      if (rk < rowMin || rk > rowMax) continue
      const text = rowMap.get(rk)[actSide].join(' ').trim()
      if (monthRe.test(text) && /\d{4}/.test(text)) { period = text; break }
    }
    if (!period) {
      for (const rk of sortedRowKeys) {
        const { left, right } = rowMap.get(rk)
        const text = [...left, ...right].join(' ').trim()
        if (monthRe.test(text) && /\d{4}/.test(text)) { period = text; break }
      }
    }

    let brokerName = '', brokerAddress = ''
    for (const row of page.rows) {
      if (row.row < 100 || row.row > 160) continue
      const text = row.items.map(i => i.str).join(' ')
      if (text.includes('Interactive Brokers')) {
        const comma = text.indexOf(',')
        brokerName = comma > 0 ? text.slice(0, comma).trim() : text.trim()
        brokerAddress = comma > 0 ? text.slice(comma + 1).trim() : ''
        break
      }
    }

    return [
      ['Statement', 'Data', 'Title', 'Activity Statement'],
      ['Statement', 'Data', 'Period', period],
      ['Statement', 'Data', 'BrokerName', brokerName],
      ['Statement', 'Data', 'BrokerAddress', brokerAddress],
      ['Statement', 'Data', 'WhenGenerated', ''],
    ]
  }

  // ---------------------------------------------------------------------------
  // Account Information — key/value pairs
  // ---------------------------------------------------------------------------

  #extractAccountInfo(pages) {
    const rows = []
    let inSection = false

    for (const page of pages) {
      for (const pRow of page.rows) {
        const leftItems = pRow.items.filter(i => i.col < 180)
        if (!leftItems.length) continue
        const firstText = leftItems[0].str

        if (firstText === 'Account Information') { inSection = true; continue }
        if (!inSection) continue
        if (PdfTableExtractor.#SECTION_NAMES.has(firstText)) { inSection = false; continue }
        if (firstText.startsWith('Activity Statement') || firstText.startsWith('Generated')) continue

        const keyItem = pRow.items.find(i => i.col < 100)
        const valItem = pRow.items.find(i => i.col >= 100)
        if (!keyItem) continue

        let key = keyItem.str
        if (key === 'Account Capabilities') key = 'Capabilities'
        rows.push(['Account Information', 'Data', key, valItem?.str ?? ''])
      }
    }
    return rows
  }

  // ---------------------------------------------------------------------------
  // Open Positions — table-based column detection
  // ---------------------------------------------------------------------------

  #extractOpenPositions(pages) {
    const rows = []
    let inSection = false
    let headerEmitted = false
    let colPositions = null
    let assetCategory = 'Stocks'
    let currency = ''

    for (const page of pages) {
      for (const pRow of page.rows) {
        const allItems = pRow.items
        if (!allItems.length) continue
        // Use truly leftmost item (no col constraint) so layouts where columns
        // start beyond col 200 are handled correctly — mirrors #extractFii.
        const firstText = allItems[0].str

        if (firstText === 'Open Positions') { inSection = true; continue }
        if (!inSection) continue
        if (PdfTableExtractor.#SECTION_NAMES.has(firstText) && firstText !== 'Open Positions') {
          inSection = false; continue
        }
        if (firstText.startsWith('Activity Statement') || firstText.startsWith('Generated')) continue
        if (firstText === 'Stocks' || firstText === 'Options' || firstText === 'Bonds') {
          assetCategory = firstText; continue
        }
        if (firstText === 'EUR' || firstText === 'USD') { currency = firstText; continue }
        if (firstText.startsWith('Total') || firstText === 'Forex') continue

        // Column-header row: detect "Symbol" anywhere in the row (not just as the
        // leftmost item) so layouts where a prefix column precedes "Symbol" still work.
        const symbolInRow = allItems.find(i => i.str === 'Symbol')
        if (symbolInRow && allItems.length >= 2) {
          colPositions = this.#detectColumns(allItems)
          if (!headerEmitted) {
            const colNames = allItems.map(i => i.str)
            rows.push(['Open Positions', 'Header', 'DataDiscriminator', 'Asset Category', 'Currency', ...colNames])
            headerEmitted = true
          }
          continue
        }

        if (!colPositions) continue

        // Data row: leftmost item must be near the Symbol column anchor
        if (Math.abs(allItems[0].col - colPositions[0]) > 40 || allItems[0].str.startsWith('Total')) continue

        const cells = this.#assignToColumns(allItems, colPositions)
        rows.push(['Open Positions', 'Data', 'Summary', assetCategory, currency, ...cells])
      }
    }
    return rows
  }

  // ---------------------------------------------------------------------------
  // Trades — table-based with multi-line date/time lookup
  // ---------------------------------------------------------------------------

  #extractTrades(pages) {
    const rows = []
    let inSection = false
    let headerEmitted = false
    let inForex = false
    let assetCategory = 'Stocks'
    let currency = ''
    let colPositions = null
    let dateColPos = 146  // fallback if not detected

    // First pass: collect items within the Trades section for date/time proximity lookup.
    // Use truly leftmost item (no col constraint) for section boundary detection.
    const pageOffsets = this.#pageOffsets(pages)
    const tradeItems = []
    let collecting = false
    for (let pi = 0; pi < pages.length; pi++) {
      const offset = pageOffsets[pi]
      for (const pRow of pages[pi].rows) {
        if (!pRow.items.length) continue
        const ft = pRow.items[0].str
        if (ft === 'Trades') { collecting = true; continue }
        if (!collecting) continue
        if (PdfTableExtractor.#MAJOR_SECTIONS.has(ft) && ft !== 'Trades') { collecting = false; break }
        for (const item of pRow.items)
          tradeItems.push({ row: pRow.row + offset, col: item.col, str: item.str })
      }
    }

    // Second pass: emit rows
    for (let pi = 0; pi < pages.length; pi++) {
      const offset = pageOffsets[pi]
      for (const pRow of pages[pi].rows) {
        const allItems = pRow.items
        if (!allItems.length) continue
        // Use truly leftmost item (no col constraint) — mirrors #extractOpenPositions fix.
        const firstText = allItems[0].str

        if (firstText === 'Trades') {
          inSection = true; inForex = false; continue
        }
        if (!inSection) continue
        if (PdfTableExtractor.#MAJOR_SECTIONS.has(firstText) && firstText !== 'Trades') {
          inSection = false; continue
        }
        if (firstText.startsWith('Activity Statement') || firstText.startsWith('Generated')) continue

        if (firstText === 'Stocks' || firstText === 'Options' || firstText === 'Bonds') {
          assetCategory = firstText; inForex = false; continue
        }
        if (/^(forex|fx)$/i.test(firstText)) { assetCategory = 'Forex'; inForex = true; continue }
        if (inForex) continue
        if (firstText === 'EUR' || firstText === 'USD') { currency = firstText; continue }
        if (firstText.startsWith('Total') || firstText === ' Total') continue

        // Column-header row: detect "Symbol" anywhere in the row (not just as leftmost item)
        // so layouts where a prefix column precedes "Symbol" still work.
        const symbolInRow = allItems.find(i => i.str === 'Symbol')
        if (symbolInRow || firstText === 'DataDiscriminator') {
          if (symbolInRow) {
            colPositions = this.#detectColumns(allItems)
            if (colPositions.length >= 2) dateColPos = colPositions[1]
            if (!headerEmitted) {
              const colNames = allItems.map(i => i.str)
              rows.push([
                'Trades', 'Header',
                'DataDiscriminator', 'Asset Category', 'Currency',
                ...colNames,
                'Settle Date/Time', 'Exchange', 'Buy/Sell',
              ])
              headerEmitted = true
            }
          }
          continue
        }

        if (!colPositions) continue

        // Data row: leftmost item must be near the Symbol column anchor
        if (Math.abs(allItems[0].col - colPositions[0]) > 40 || allItems[0].str.startsWith('Total') || allItems[0].str === 'Symbol') continue

        const symAbsRow = pRow.row + offset

        // Date/time proximity lookup using detected date column position.
        let dateStr = '', timeStr = ''
        for (const item of tradeItems) {
          if (Math.abs(item.col - dateColPos) > 30) continue
          const rowDiff = symAbsRow - item.row
          if (rowDiff >= 2 && rowDiff <= 8 && /^\d{4}-\d{2}-\d{2},$/.test(item.str))
            dateStr = item.str.slice(0, -1)
          if (rowDiff >= -6 && rowDiff < 0 && /^\d{2}:\d{2}:\d{2}$/.test(item.str))
            timeStr = item.str
        }
        const datetime = dateStr ? `${dateStr}, ${timeStr}`.replace(/, $/, '') : ''

        if (/^(forex|fx)$/i.test(assetCategory)) continue

        const cells = this.#assignToColumns(allItems, colPositions)
        // Belt-and-suspenders: skip forex pair trades even when the "Forex"
        // sub-header row is not detected (e.g. it has more than one PDF item).
        if (/^[A-Z]{3}\.[A-Z]{3}$/.test(cells[0] ?? '')) continue
        // Find the first signed-number cell to determine Buy/Sell side
        const qty = cells.find(c => /^-?\d/.test(c)) ?? ''
        const side = qty.startsWith('-') ? 'SELL' : 'BUY'

        // Overwrite the date slot (cells[1]) with the resolved multi-line datetime
        if (cells.length >= 2) cells[1] = datetime

        rows.push([
          'Trades', 'Data', 'Order',
          assetCategory, currency,
          ...cells,
          '', '', side,
        ])
      }
    }
    return rows
  }

  // ---------------------------------------------------------------------------
  // Dividends, Withholding Tax, and Interest — right column
  // ---------------------------------------------------------------------------

  #extractRightColumn(pages, colMid) {
    const rows = []

    // Emit fixed headers so domain parsers always find them
    rows.push(
      ['Dividends',       'Header', 'Currency', 'Date', 'Description', 'Amount'],
      ['Withholding Tax', 'Header', 'Currency', 'Date', 'Description', 'Amount', 'Code'],
      ['Interest',        'Header', 'Currency', 'Date', 'Description', 'Amount'],
    )

    // Collect all right-column items with page offsets to avoid row-key collisions
    const pageOffsets = this.#pageOffsets(pages)
    const rightItems = []
    for (let pi = 0; pi < pages.length; pi++) {
      const offset = pageOffsets[pi]
      for (const pRow of pages[pi].rows)
        for (const item of pRow.items)
          if (item.col >= colMid)
            rightItems.push({ row: pRow.row + offset, col: item.col, str: item.str })
    }

    const rowMap = new Map()
    for (const item of rightItems) {
      if (!rowMap.has(item.row)) rowMap.set(item.row, [])
      rowMap.get(item.row).push(item)
    }
    const sortedRows = [...rowMap.keys()].sort((a, b) => a - b)

    // Column positions detected from each section's own header row
    const sectionColPositions = {}
    let currentSection = ''
    let sectionCurrency = { Dividends: '', 'Withholding Tax': '', Interest: '' }

    for (const rowKey of sortedRows) {
      const items = rowMap.get(rowKey).slice().sort((a, b) => a.col - b.col)
      if (!items.length) continue
      const firstText = items[0].str

      if (firstText === 'Dividends' || firstText === 'Withholding Tax' || firstText === 'Interest') {
        currentSection = firstText
        continue
      }
      if (!currentSection) continue

      if (firstText.startsWith('Activity Statement') || firstText.startsWith('Generated')) continue

      // Currency sub-header
      if (firstText === 'EUR' || firstText === 'USD') {
        sectionCurrency[currentSection] = firstText
        continue
      }

      // Column-header row: "Date" or "Currency" as first item
      if (firstText === 'Date' || firstText === 'Currency') {
        sectionColPositions[currentSection] = this.#detectColumns(items)
        continue
      }

      if (firstText.startsWith('Total') || firstText === ' Total') continue

      const colPos = sectionColPositions[currentSection]
      if (!colPos) continue

      // Data row: must contain a date (YYYY-MM-DD) item
      const dateItem = items.find(i => /^\d{4}-\d{2}-\d{2}$/.test(i.str))
      if (!dateItem) continue

      // Collect multi-row description fragments within ±12 rows of this row
      const [datePx, ...rest] = colPos.length >= 3 ? [colPos[0], colPos[1], colPos[colPos.length - 1]] : colPos
      const descColStart = colPos.length >= 3 ? colPos[1] : (colPos[0] + 30)
      const descColEnd = colPos.length >= 3 ? colPos[colPos.length - 1] - 20 : descColStart + 200
      const descFragments = []
      for (const rk of sortedRows) {
        if (Math.abs(rk - rowKey) > 12) continue
        const ri = rowMap.get(rk)
        if (!ri) continue
        for (const it of ri)
          if (it.col >= descColStart && it.col < descColEnd &&
              !/^\d{4}-\d{2}-\d{2}$/.test(it.str) && !/^-?\d/.test(it.str))
            descFragments.push({ row: rk, str: it.str })
      }
      descFragments.sort((a, b) => a.row - b.row)
      const description = [...new Set(descFragments.map(f => f.str))].join(' ').trim()

      const amtItem = items.find(i => /^-?\d/.test(i.str) && i !== dateItem)
      if (!amtItem) continue
      const currency = sectionCurrency[currentSection]

      if (currentSection === 'Dividends') {
        rows.push(['Dividends', 'Data', currency, dateItem.str, description, amtItem.str])
      } else if (currentSection === 'Withholding Tax') {
        const codeItem = items.find(i => i.col > amtItem.col && i !== dateItem)
        rows.push(['Withholding Tax', 'Data', currency, dateItem.str, description, amtItem.str, codeItem?.str ?? ''])
      } else if (currentSection === 'Interest') {
        rows.push(['Interest', 'Data', currency, dateItem.str, description, amtItem.str])
      }
    }

    return rows
  }

  // ---------------------------------------------------------------------------
  // Interest — left-column extraction (for PDFs where Interest is not on the right)
  // ---------------------------------------------------------------------------

  #extractInterest(pages) {
    const rows = []
    let inSection = false
    let colPositions = null
    let currency = ''

    for (const page of pages) {
      for (const pRow of page.rows) {
        const items = pRow.items
        if (!items.length) continue
        const firstText = items[0].str

        if (firstText === 'Interest') { inSection = true; continue }
        if (!inSection) continue
        if (PdfTableExtractor.#SECTION_NAMES.has(firstText) && firstText !== 'Interest') {
          inSection = false; continue
        }
        if (firstText.startsWith('Activity Statement') || firstText.startsWith('Generated')) continue
        if (firstText === 'EUR' || firstText === 'USD') { currency = firstText; continue }
        if (firstText.startsWith('Total')) continue

        // Column-header row
        if (firstText === 'Currency' || firstText === 'Date') {
          colPositions = this.#detectColumns(items)
          continue
        }

        if (!colPositions) continue

        const dateItem = items.find(i => /^\d{4}-\d{2}-\d{2}$/.test(i.str))
        if (!dateItem) continue

        const cells = this.#assignToColumns(items, colPositions)
        // cells layout matches: Currency, Date, Description, Amount
        const [cur, date, description, amount] = cells
        rows.push(['Interest', 'Data', cur || currency, date || dateItem.str, description ?? '', amount ?? ''])
      }
    }
    return rows
  }

  // ---------------------------------------------------------------------------
  // Financial Instrument Information — table-based
  // ---------------------------------------------------------------------------

  #extractFii(pages) {
    const rows = []
    let inSection = false
    let headerEmitted = false
    let colPositions = null
    let assetCategory = 'Stocks'

    // Collect FII items for description fragment lookup
    const pageOffsets = this.#pageOffsets(pages)
    const fiiItems = []
    for (let pi = 0; pi < pages.length; pi++) {
      const offset = pageOffsets[pi]
      let inFii = false
      for (const pRow of pages[pi].rows) {
        const ft = pRow.items[0]?.str
        if (!ft) continue
        if (ft === 'Financial Instrument Information') { inFii = true; continue }
        if (inFii && PdfTableExtractor.#MAJOR_SECTIONS.has(ft) && ft !== 'Financial Instrument Information')
          inFii = false
        if (inFii)
          for (const item of pRow.items)
            fiiItems.push({ row: pRow.row + offset, col: item.col, str: item.str })
      }
    }

    const fiiRowMap = new Map()
    for (const item of fiiItems) {
      if (!fiiRowMap.has(item.row)) fiiRowMap.set(item.row, [])
      fiiRowMap.get(item.row).push(item)
    }
    const sortedFiiRows = [...fiiRowMap.keys()].sort((a, b) => a - b)

    for (let pi = 0; pi < pages.length; pi++) {
      const offset = pageOffsets[pi]
      for (const pRow of pages[pi].rows) {
        const items = pRow.items
        if (!items.length) continue
        const firstText = items[0].str

        if (firstText === 'Financial Instrument Information') {
          inSection = true; continue
        }
        if (!inSection) continue
        if (PdfTableExtractor.#MAJOR_SECTIONS.has(firstText) && firstText !== 'Financial Instrument Information') {
          inSection = false; continue
        }
        if (firstText.startsWith('Activity Statement') || firstText.startsWith('Generated')) continue
        if (firstText === 'Stocks' || firstText === 'Options' || firstText === 'Bonds') {
          assetCategory = firstText; continue
        }
        if (/^(forex|fx)$/i.test(firstText)) { assetCategory = 'Forex'; continue }

        // Column-header row: first item = "Symbol"
        if (firstText === 'Symbol') {
          colPositions = this.#detectColumns(items)
          if (!headerEmitted) {
            const colNames = items.map(i => i.str)
            rows.push(['Financial Instrument Information', 'Header', 'Asset Category', ...colNames])
            headerEmitted = true
          }
          continue
        }

        if (!colPositions) continue
        if (firstText.startsWith('Total')) continue

        // Data row: must have a Conid value (numeric) somewhere
        const hasConid = items.some(i => /^\d{5,}$/.test(i.str))
        if (!hasConid) continue

        const offsetRow = pRow.row + offset
        // Collect description fragments from nearby rows at the description column position
        const descColPos = colPositions.length >= 2 ? colPositions[1] : (colPositions[0] + 80)
        const descFragments = []
        for (const rk of sortedFiiRows) {
          if (Math.abs(rk - offsetRow) > 10) continue
          const ri = fiiRowMap.get(rk)
          if (!ri) continue
          for (const it of ri)
            if (Math.abs(it.col - descColPos) <= 40 && !/^\d{5,}$/.test(it.str))
              descFragments.push({ row: rk, str: it.str })
        }
        descFragments.sort((a, b) => a.row - b.row)
        const description = [...new Set(descFragments.map(f => f.str))].join(' ').trim()

        const cells = this.#assignToColumns(items, colPositions)
        // Overwrite description slot (colPositions[1]) with the assembled multi-row description
        if (cells.length >= 2) cells[1] = description

        // Skip Forex instruments (e.g. EUR.USD) — they are currency pairs, not securities
        if (assetCategory === 'Forex' || /^[A-Z]{3}\.[A-Z]{3}$/.test(cells[0] ?? '')) continue

        rows.push(['Financial Instrument Information', 'Data', assetCategory, ...cells])
      }
    }
    return rows
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  #pageOffsets(pages) {
    const offsets = []
    let offset = 0
    for (const page of pages) {
      offsets.push(offset)
      offset += page.rowHeight
    }
    return offsets
  }

  static #SECTION_NAMES = new Set([
    'Account Information',
    'Net Asset Value',
    'Mark-to-Market Performance Summary',
    'Realized & Unrealized Performance Summary',
    'Cash Report',
    'Open Positions',
    'Forex Balances',
    'Trades',
    'Deposits & Withdrawals',
    'Interest',
    'Change in Dividend Accruals',
    'Dividends',
    'Withholding Tax',
    'Financial Instrument Information',
    'Codes',
    'Notes/Legal Notes',
  ])

  // Subset used to stop multi-page collection loops early
  static #MAJOR_SECTIONS = new Set([
    'Account Information', 'Open Positions', 'Trades',
    'Dividends', 'Withholding Tax', 'Interest',
    'Financial Instrument Information', 'Codes', 'Notes/Legal Notes',
  ])
}
