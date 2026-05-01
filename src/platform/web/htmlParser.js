/**
 * Browser-side HTML parser. Wraps DOMParser so domain and application code
 * remain free of browser globals.
 *
 * @param {string} htmlText
 * @returns {Document}
 */
export function parseHtmlDocument(htmlText) {
  return new DOMParser().parseFromString(htmlText, 'text/html')
}
