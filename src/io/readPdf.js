import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).href

/**
 * Extract all text from a PDF File, preserving page order.
 * Text items within a page are space-joined; pages are newline-joined.
 *
 * @param {File} file
 * @returns {Promise<string>}
 */
export async function readPdfText(file) {
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise

  const pageTexts = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    pageTexts.push(content.items.map(item => item.str).join(' '))
  }

  return pageTexts.join('\n')
}
