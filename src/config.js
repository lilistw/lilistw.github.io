/**
 * Feature flags read from Vite environment variables.
 * Set VITE_ENABLE_PDF=false to disable PDF support at build time.
 */
export const SUPPORTED_FORMATS = {
  csv:  true,
  html: true,
  pdf:  import.meta.env.VITE_ENABLE_PDF !== 'false',
}
