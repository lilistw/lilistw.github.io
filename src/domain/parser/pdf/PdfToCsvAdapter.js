import { t } from '../../../localization/i18n.js'

/**
 * Adapts IBKR Activity Statement PDF page data to string[][] rows,
 * matching the format that PapaParse produces from the CSV Activity Statement.
 *
 * Coordinate convention for IBKR PDFs:
 *   item.row  = transform[4] → vertical position (0 = top, increases downward)
 *   item.col  = transform[5] → horizontal position (0 = left, increases rightward)
 *   page.colWidth = 792, page.rowHeight = 612 (landscape)
 *   Two-column layout midpoint: col ≈ colWidth / 2 = 396
 */
export class PdfToCsvAdapter {
  /**
   * @param {import('../../../io/readPdf.js').PdfPage[]} pages
   * @returns {string[][]}
   */
  adapt(pages) {
    if (!pages || pages.length === 0) {
      throw new Error(t('errors.invalidPdfFormat'))
    }

    const colMid = (pages[0]?.colWidth ?? 792) / 2
    const rows = []

    rows.push(...this.#extractStatement(pages[0]))
    rows.push(...this.#extractAccountInfo(pages))
    rows.push(...this.#extractOpenPositions(pages))
    rows.push(...this.#extractTrades(pages))
    rows.push(...this.#extractDividendsAndWht(pages, colMid))
    rows.push(...this.#extractFii(pages))

    const hasStatementMarker = rows.some(r => r[0] === 'Statement' && r[1] === 'Data')
    if (!hasStatementMarker) {
      throw new Error(t('errors.invalidPdfFormat'))
    }

    return rows
  }

  // ---------------------------------------------------------------------------
  // Statement — synthesised from the page-1 header items
  // ---------------------------------------------------------------------------

  #extractStatement(page) {
    if (!page) return []

    const colMid = page.colWidth / 2
    // Header items are in the top-right area: row < 100, col > colMid
    const headerItems = []
    for (const row of page.rows) {
      if (row.row >= 100) break
      for (const item of row.items) {
        if (item.col > colMid) headerItems.push({ row: row.row, ...item })
      }
    }

    // Sort by row, then col
    headerItems.sort((a, b) => a.row - b.row || a.col - b.col)

    // Collect the first two distinct-row text blobs: title and period
    const distinctRows = []
    let lastRow = -1
    for (const item of headerItems) {
      if (item.row !== lastRow) {
        distinctRows.push({ row: item.row, text: item.str })
        lastRow = item.row
      } else {
        distinctRows[distinctRows.length - 1].text += ' ' + item.str
      }
    }

    const title = distinctRows[0]?.text ?? 'Activity Statement'
    const period = distinctRows[1]?.text ?? ''

    // Broker name from the centred address line (col 200–400, row 100–150)
    let brokerName = ''
    let brokerAddress = ''
    for (const row of page.rows) {
      if (row.row < 100 || row.row > 160) continue
      const text = row.items.map(i => i.str).join(' ')
      if (text.includes('Interactive Brokers')) {
        const comma = text.indexOf(',')
        if (comma > 0) {
          brokerName = text.slice(0, comma).trim()
          brokerAddress = text.slice(comma + 1).trim()
        } else {
          brokerName = text.trim()
        }
        break
      }
    }

    return [
      ['Statement', 'Data', 'Title', title],
      ['Statement', 'Data', 'Period', period],
      ['Statement', 'Data', 'BrokerName', brokerName],
      ['Statement', 'Data', 'BrokerAddress', brokerAddress],
      ['Statement', 'Data', 'WhenGenerated', ''],
    ]
  }

  // ---------------------------------------------------------------------------
  // Account Information
  // ---------------------------------------------------------------------------

  #extractAccountInfo(pages) {
    const rows = []
    let inSection = false

    for (const page of pages) {
      for (const pRow of page.rows) {
        const leftItems = pRow.items.filter(i => i.col < 180)
        if (leftItems.length === 0) continue

        const firstText = leftItems[0].str

        if (firstText === 'Account Information') {
          inSection = true
          continue
        }

        if (inSection) {
          // Exit when we hit the next section header
          if (this.#isSectionHeader(firstText, leftItems, pRow.items)) {
            inSection = false
            continue
          }

          // Skip page footers / sub-totals
          if (firstText.startsWith('Activity Statement') || firstText.startsWith('Generated')) {
            continue
          }

          // Key–value: key at col≈38, value at col≈182
          const keyItem = pRow.items.find(i => i.col < 100)
          const valItem = pRow.items.find(i => i.col >= 100)
          if (!keyItem) continue

          // Normalise "Account Capabilities" → "Capabilities" to match parseStatementInfo
          let key = keyItem.str
          if (key === 'Account Capabilities') key = 'Capabilities'

          rows.push(['Account Information', 'Data', key, valItem?.str ?? ''])
        }
      }
    }

    return rows
  }

  // ---------------------------------------------------------------------------
  // Open Positions
  // ---------------------------------------------------------------------------

  #extractOpenPositions(pages) {
    const rows = []
    let inSection = false
    let headerEmitted = false
    let assetCategory = 'Stocks'
    let currency = ''

    // Synthesised column header matching parseOpenPositions expectations
    const HEADER = [
      'Open Positions', 'Header',
      'Asset Category', 'Currency', 'Symbol',
      'Quantity', 'Mult', 'Cost Price', 'Cost Basis',
      'Close Price', 'Value', 'Unrealized P/L', 'Code',
    ]

    for (const page of pages) {
      for (const pRow of page.rows) {
        const items = pRow.items.filter(i => i.col < 400)
        if (items.length === 0) continue

        const firstText = items[0].str

        if (firstText === 'Open Positions') {
          inSection = true
          if (!headerEmitted) {
            rows.push(HEADER)
            headerEmitted = true
          }
          continue
        }

        if (!inSection) continue

        if (this.#isSectionHeader(firstText, items, pRow.items)) {
          inSection = false
          continue
        }

        if (firstText.startsWith('Activity Statement') || firstText.startsWith('Generated')) continue

        // Sub-headers
        if (firstText === 'Stocks' || firstText === 'Options' || firstText === 'Bonds') {
          assetCategory = firstText
          continue
        }
        if (firstText === 'EUR' || firstText === 'USD') {
          currency = firstText
          continue
        }
        // Skip totals, column headers, and "Forex Balances" area
        if (firstText.startsWith('Total') || firstText === 'Symbol' || firstText === 'Forex') {
          continue
        }

        // Data row: must have symbol at col<100 and quantity at col≈251
        const symbol = this.#pickCol(pRow.items, 35, 100)
        if (!symbol) continue

        const qty        = this.#pickCol(pRow.items, 220, 280)
        const mult       = this.#pickCol(pRow.items, 280, 330)
        const costPrice  = this.#pickCol(pRow.items, 330, 420)
        const costBasis  = this.#pickCol(pRow.items, 420, 490)
        const closePrice = this.#pickCol(pRow.items, 490, 560)
        const value      = this.#pickCol(pRow.items, 560, 650)
        const unrealPL   = this.#pickCol(pRow.items, 650, 720)
        const code       = this.#pickCol(pRow.items, 720, 780)

        rows.push([
          'Open Positions', 'Data', 'Summary',
          assetCategory, currency, symbol,
          qty ?? '', mult ?? '', costPrice ?? '', costBasis ?? '',
          closePrice ?? '', value ?? '', unrealPL ?? '', code ?? '',
        ])
      }
    }

    return rows
  }

  // ---------------------------------------------------------------------------
  // Trades (for cost basis — Activity Statement does not have exchange/settle)
  // ---------------------------------------------------------------------------

  #extractTrades(pages) {
    const rows = []
    let inSection = false
    let headerEmitted = false
    let inForex = false
    let assetCategory = 'Stocks'
    let currency = ''

    const HEADER = [
      'Trades', 'Header',
      'DataDiscriminator', 'Asset Category', 'Currency', 'Symbol',
      'Date/Time', 'Settle Date/Time', 'Exchange', 'Buy/Sell',
      'Quantity', 'Price', 'Proceeds', 'Comm/Fee',
      'Basis', 'Realized P/L', 'Code',
    ]

    // Collect all trade items across all pages in one pass
    // so we can look up nearby date/time fragments.
    // Page offsets prevent row-coordinate collisions across pages.
    const pageOffsets = this.#pageOffsets(pages)
    const tradeItems = [] // { row, col, str }
    let collecting = false

    for (let pi = 0; pi < pages.length; pi++) {
      const page = pages[pi]
      const rowOffset = pageOffsets[pi]
      for (const pRow of page.rows) {
        const leftItems = pRow.items.filter(i => i.col < 400)
        if (leftItems.length === 0) continue
        const firstText = leftItems[0].str

        if (firstText === 'Trades') {
          collecting = true
          continue
        }

        if (!collecting) continue

        // Stop at next major non-Trades section
        if (this.#isMajorSectionHeader(firstText) && firstText !== 'Trades') {
          collecting = false
          break
        }

        for (const item of pRow.items) {
          if (item.col < 400) {
            tradeItems.push({ row: pRow.row + rowOffset, col: item.col, str: item.str })
          }
        }
      }
    }

    // Build a map: row → array of items
    const rowMap = new Map()
    for (const item of tradeItems) {
      if (!rowMap.has(item.row)) rowMap.set(item.row, [])
      rowMap.get(item.row).push(item)
    }

    const sortedRows = [...rowMap.keys()].sort((a, b) => a - b)

    for (let pi = 0; pi < pages.length; pi++) {
      const pageRow = pages[pi]
      const rowOffset = pageOffsets[pi]
      for (const pRow of pageRow.rows) {
        const leftItems = pRow.items.filter(i => i.col < 400)
        if (leftItems.length === 0) continue
        const firstText = leftItems[0].str

        if (firstText === 'Trades') {
          inSection = true
          if (!headerEmitted) {
            rows.push(HEADER)
            headerEmitted = true
          }
          inForex = false
          continue
        }

        if (!inSection) continue

        if (this.#isMajorSectionHeader(firstText) && firstText !== 'Trades') {
          inSection = false
          continue
        }

        if (firstText.startsWith('Activity Statement') || firstText.startsWith('Generated')) continue

        // Sub-headers
        if (firstText === 'Stocks' || firstText === 'Options' || firstText === 'Bonds') {
          assetCategory = firstText
          inForex = false
          continue
        }
        if (/^(forex|fx)$/i.test(firstText)) {
          inForex = true
          continue
        }
        if (inForex) continue

        if (firstText === 'EUR' || firstText === 'USD') {
          currency = firstText
          continue
        }

        // Skip totals and column headers
        if (firstText.startsWith('Total') || firstText === ' Total' ||
            firstText === 'Symbol' || firstText === 'DataDiscriminator') {
          continue
        }

        // Data row: symbol at col<100, followed by numeric data
        const symbol = this.#pickCol(leftItems, 35, 100)
        if (!symbol || symbol === 'Symbol') continue
        if (symbol.startsWith('Total')) continue

        // Look for date fragment: item at col≈146, row slightly above
        const symRow = pRow.row + rowOffset
        let dateStr = ''
        let timeStr = ''
        for (const item of tradeItems) {
          if (item.col < 130 || item.col > 170) continue
          const rowDiff = symRow - item.row
          if (rowDiff >= 2 && rowDiff <= 8 && /^\d{4}-\d{2}-\d{2},$/.test(item.str)) {
            dateStr = item.str.slice(0, -1) // remove trailing comma
          }
          if (rowDiff >= -6 && rowDiff < 0 && /^\d{2}:\d{2}:\d{2}$/.test(item.str)) {
            timeStr = item.str
          }
        }

        const datetime = dateStr
          ? `${dateStr}, ${timeStr}`.replace(/, $/, '')
          : ''

        const qty       = this.#pickCol(leftItems, 280, 320)
        const price     = this.#pickCol(leftItems, 320, 360)
        const proceeds  = this.#pickCol(leftItems, 420, 470)
        const commFee   = this.#pickCol(leftItems, 485, 525)
        const basis     = this.#pickCol(leftItems, 525, 590)
        const realizedPL = this.#pickCol(leftItems, 590, 660)
        const code      = this.#pickCol(leftItems, 735, 760)

        const side = qty && qty.startsWith('-') ? 'SELL' : 'BUY'

        rows.push([
          'Trades', 'Data', 'Order',
          assetCategory, currency, symbol,
          datetime, '', '',
          side, qty ?? '', price ?? '', proceeds ?? '',
          commFee ?? '', basis ?? '', realizedPL ?? '', code ?? '',
        ])
      }
    }

    return rows
  }

  // ---------------------------------------------------------------------------
  // Dividends and Withholding Tax (right column)
  // ---------------------------------------------------------------------------

  #extractDividendsAndWht(pages, colMid) {
    const rows = []

    // Collect right-column items from all pages with page offsets
    // so items from different pages don't share the same row keys.
    const pageOffsets = this.#pageOffsets(pages)
    const rightItems = [] // { row, col, str }
    for (let pi = 0; pi < pages.length; pi++) {
      const page = pages[pi]
      const rowOffset = pageOffsets[pi]
      for (const pRow of page.rows) {
        for (const item of pRow.items) {
          if (item.col >= colMid) {
            rightItems.push({ row: pRow.row + rowOffset, col: item.col, str: item.str })
          }
        }
      }
    }

    // Build row map for right items
    const rightRowMap = new Map()
    for (const item of rightItems) {
      if (!rightRowMap.has(item.row)) rightRowMap.set(item.row, [])
      rightRowMap.get(item.row).push(item)
    }
    const sortedRightRows = [...rightRowMap.keys()].sort((a, b) => a - b)

    // --- Dividends ---
    rows.push(
      ['Dividends', 'Header', 'Currency', 'Date', 'Description', 'Amount'],
      ['Withholding Tax', 'Header', 'Currency', 'Date', 'Description', 'Amount', 'Code'],
    )

    let divCurrency = ''
    let whtCurrency = ''
    let currentRightSection = ''

    for (const rowKey of sortedRightRows) {
      const items = rightRowMap.get(rowKey)
      if (!items || items.length === 0) continue

      // Sort items by col
      items.sort((a, b) => a.col - b.col)
      const firstText = items[0].str

      if (firstText === 'Dividends') {
        currentRightSection = 'Dividends'
        continue
      }
      if (firstText === 'Withholding Tax') {
        currentRightSection = 'Withholding Tax'
        continue
      }

      if (!currentRightSection) continue

      // Skip headers and footers
      if (firstText === 'Date' || firstText.startsWith('Activity Statement') ||
          firstText.startsWith('Generated')) continue

      // Currency sub-header
      if (firstText === 'EUR' || firstText === 'USD') {
        if (currentRightSection === 'Dividends') divCurrency = firstText
        else whtCurrency = firstText
        continue
      }

      // Skip total lines
      if (firstText.startsWith('Total') || firstText === ' Total') continue

      if (currentRightSection === 'Dividends') {
        // Date row: col≈412 has YYYY-MM-DD date, col≈730-740 has amount
        const dateItem = items.find(i => /^\d{4}-\d{2}-\d{2}$/.test(i.str))
        const amtItem  = items.find(i => i.col > 700 && /^-?\d/.test(i.str))
        if (!dateItem || !amtItem) continue

        // Collect description fragments: col≈482, within ±10 rows
        let description = ''
        for (const rk of sortedRightRows) {
          const diff = Math.abs(rk - rowKey)
          if (diff > 12) continue
          const ri = rightRowMap.get(rk)
          if (!ri) continue
          for (const it of ri) {
            if (it.col >= 460 && it.col <= 550 && !(/^\d{4}-\d{2}-\d{2}$/.test(it.str))) {
              // Only collect description items for same entry
              if (rk !== rowKey || !(/^-?\d/.test(it.str))) {
                description += (description ? ' ' : '') + it.str
              }
            }
          }
        }
        description = description.trim()

        rows.push(['Dividends', 'Data', divCurrency, dateItem.str, description, amtItem.str])
      } else if (currentRightSection === 'Withholding Tax') {
        const dateItem = items.find(i => /^\d{4}-\d{2}-\d{2}$/.test(i.str))
        const amtItem  = items.find(i => i.col > 680 && i.col < 740 && /^-?\d/.test(i.str))
        if (!dateItem || !amtItem) continue

        // Description at col≈464
        let description = ''
        for (const rk of sortedRightRows) {
          const diff = Math.abs(rk - rowKey)
          if (diff > 12) continue
          const ri = rightRowMap.get(rk)
          if (!ri) continue
          for (const it of ri) {
            if (it.col >= 445 && it.col <= 560 && !/^\d{4}-\d{2}-\d{2}$/.test(it.str) &&
                !/^-?\d/.test(it.str)) {
              description += (description ? ' ' : '') + it.str
            }
          }
        }
        description = description.trim()

        const codeItem = items.find(i => i.col >= 740)
        rows.push([
          'Withholding Tax', 'Data', whtCurrency,
          dateItem.str, description, amtItem.str, codeItem?.str ?? '',
        ])
      }
    }

    return rows
  }

  // ---------------------------------------------------------------------------
  // Financial Instrument Information
  // ---------------------------------------------------------------------------

  #extractFii(pages) {
    const rows = []
    let inSection = false
    let headerEmitted = false
    let assetCategory = 'Stocks'

    const HEADER = [
      'Financial Instrument Information', 'Header',
      'Asset Category', 'Symbol', 'Description', 'Conid',
      'Security ID', 'Underlying', 'Listing Exch', 'Multiplier', 'Type', 'Code',
    ]

    // Collect all FII items across pages for description fragment lookup.
    // Page offsets prevent row-coordinate collisions across pages.
    const pageOffsets = this.#pageOffsets(pages)
    const fiiItems = []

    for (let pi = 0; pi < pages.length; pi++) {
      const page = pages[pi]
      const rowOffset = pageOffsets[pi]
      let inFii = false
      for (const pRow of page.rows) {
        const firstItem = pRow.items[0]
        if (!firstItem) continue
        const firstText = firstItem.str

        if (firstText === 'Financial Instrument Information') {
          inFii = true
          continue
        }
        if (inFii && this.#isMajorSectionHeader(firstText) &&
            firstText !== 'Financial Instrument Information') {
          inFii = false
        }
        if (inFii) {
          for (const item of pRow.items) {
            fiiItems.push({ row: pRow.row + rowOffset, col: item.col, str: item.str })
          }
        }
      }
    }

    // Build row map
    const fiiRowMap = new Map()
    for (const item of fiiItems) {
      if (!fiiRowMap.has(item.row)) fiiRowMap.set(item.row, [])
      fiiRowMap.get(item.row).push(item)
    }
    const sortedFiiRows = [...fiiRowMap.keys()].sort((a, b) => a - b)

    for (let pi = 0; pi < pages.length; pi++) {
      const page = pages[pi]
      const rowOffset = pageOffsets[pi]
      for (const pRow of page.rows) {
        const firstItem = pRow.items[0]
        if (!firstItem) continue
        const firstText = firstItem.str

        if (firstText === 'Financial Instrument Information') {
          inSection = true
          if (!headerEmitted) {
            rows.push(HEADER)
            headerEmitted = true
          }
          continue
        }

        if (!inSection) continue

        if (this.#isMajorSectionHeader(firstText) &&
            firstText !== 'Financial Instrument Information') {
          inSection = false
          continue
        }

        if (firstText.startsWith('Activity Statement') || firstText.startsWith('Generated')) continue
        if (firstText === 'Stocks' || firstText === 'Options' || firstText === 'Bonds') {
          assetCategory = firstText
          continue
        }
        if (firstText === 'Symbol') continue // column header row

        // Data row: symbol at col≈40, conid at col≈255+
        const symbol = this.#pickCol(pRow.items, 35, 100)
        if (!symbol || symbol.startsWith('Total')) continue

        // Check this row has Conid (otherwise it might be just a description overflow)
        const conid = this.#pickCol(pRow.items, 230, 290)
        if (!conid) continue

        const securityId  = this.#pickCol(pRow.items, 300, 380)
        const underlying  = this.#pickCol(pRow.items, 380, 455)
        const listingExch = this.#pickCol(pRow.items, 455, 530)
        const multiplier  = this.#pickCol(pRow.items, 530, 600)
        const type        = this.#pickCol(pRow.items, 600, 725)
        const code        = this.#pickCol(pRow.items, 725, 780)

        // Collect description fragments: col in [100,230), within ±8 rows of this row
        const offsetRow = pRow.row + rowOffset
        const descFragments = []
        for (const rk of sortedFiiRows) {
          if (Math.abs(rk - offsetRow) > 10) continue
          const ri = fiiRowMap.get(rk)
          if (!ri) continue
          for (const it of ri) {
            if (it.col >= 100 && it.col < 230) {
              descFragments.push({ row: rk, str: it.str })
            }
          }
        }
        descFragments.sort((a, b) => a.row - b.row)
        const description = descFragments.map(f => f.str).join(' ').trim()

        rows.push([
          'Financial Instrument Information', 'Data',
          assetCategory, symbol, description, conid,
          securityId ?? '', underlying ?? '', listingExch ?? '',
          multiplier ?? '', type ?? '', code ?? '',
        ])
      }
    }

    return rows
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /** Pick the first item whose col falls within [minCol, maxCol) */
  #pickCol(items, minCol, maxCol) {
    const item = items.find(i => i.col >= minCol && i.col < maxCol)
    return item?.str ?? null
  }

  /** Known section header names that cause a section transition */
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
    'Change in Dividend Accruals',
    'Financial Instrument Information',
    'Codes',
    'Notes/Legal Notes',
  ])

  #isSectionHeader(text, leftItems, allItems) {
    return PdfToCsvAdapter.#SECTION_NAMES.has(text) && leftItems.length <= 2
  }

  #isMajorSectionHeader(text) {
    return PdfToCsvAdapter.#SECTION_NAMES.has(text)
  }

  /** Cumulative row offsets so pages don't collide in flat cross-page collections. */
  #pageOffsets(pages) {
    const offsets = []
    let offset = 0
    for (const page of pages) {
      offsets.push(offset)
      offset += page.rowHeight
    }
    return offsets
  }
}
