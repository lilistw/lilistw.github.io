import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).href

/**
 * @typedef {{ col: number, row: number, str: string, width: number }} PdfItem
 * @typedef {{ row: number, items: PdfItem[] }} PdfRow
 * @typedef {{ colWidth: number, rowHeight: number, rows: PdfRow[] }} PdfPage
 */

/**
 * Extracts structured text from a PDF file.
 *
 * IBKR PDFs use a rotated coordinate system where:
 *   transform[4] = row (vertical position, 0 at top, increases downward)
 *   transform[5] = col (horizontal position, 0 at left, increases rightward)
 *
 * Items are grouped into visual rows by row-coordinate (snapped to 2px grid),
 * sorted top-to-bottom, with items within each row sorted left-to-right.
 *
 * @param {File} file
 * @returns {Promise<PdfPage[]>}
 */
export async function readPdfPages(file) {
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise

  const pages = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const vp = page.getViewport({ scale: 1 })
    const content = await page.getTextContent()

    const byRow = new Map()
    for (const item of content.items) {
      if (!item.str || !item.str.trim()) continue
      const col = Math.round(item.transform[5])
      const rowRaw = Math.round(item.transform[4])
      const rowKey = Math.round(rowRaw / 2) * 2
      if (!byRow.has(rowKey)) byRow.set(rowKey, [])
      byRow.get(rowKey).push({
        col,
        row: rowKey,
        str: item.str.trim(),
        width: Math.round(item.width),
      })
    }

    const sortedRowKeys = [...byRow.keys()].sort((a, b) => a - b)
    const rows = sortedRowKeys.map(rowKey => ({
      row: rowKey,
      items: byRow.get(rowKey).sort((a, b) => a.col - b.col),
    }))

    pages.push({
      colWidth: Math.round(vp.width),
      rowHeight: Math.round(vp.height),
      rows,
    })
  }

  return pages
}

/**
 * Extracts plain text from a PDF File (for legacy use and testing).
 * Uses double-spaces to indicate column gaps.
 *
 * @param {File} file
 * @returns {Promise<string>}
 */
export async function readPdfText(file) {
  const pages = await readPdfPages(file)
  return pages
    .map(page =>
      page.rows
        .map(({ items }) => {
          let text = ''
          let prevRight = null
          for (const item of items) {
            if (prevRight !== null) {
              const gap = item.col - prevRight
              text += gap > 8 ? '  ' : ' '
            }
            text += item.str
            prevRight = item.col + item.width
          }
          return text.trim()
        })
        .filter(Boolean)
        .join('\n')
    )
    .join('\n')
}
