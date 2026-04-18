import { createTheme } from '@mui/material/styles'

function makeTheme(isDark) {
  const primary   = isDark ? '#9B6DE3' : '#1A6DC8'
  const g50       = isDark ? '#12101E' : '#F7F9FF'
  const g100      = isDark ? '#1D1A2C' : '#ECF0FA'
  const g200      = isDark ? '#2A263D' : '#DFE2EB'
  const divider   = isDark ? '#3A3450' : '#C3C6CF'
  const rowHover  = isDark ? 'rgba(155,109,227,0.08)' : 'rgba(26,109,200,0.06)'
  const headColor = isDark ? '#C7BDE0' : '#43474E'
  const bodyColor = isDark ? '#E6E0F0' : '#191C20'
  const btnShadow = isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,28,90,0.3)'

  return createTheme({
    palette: {
      mode: isDark ? 'dark' : 'light',
      primary:   { main: primary, contrastText: '#FFFFFF' },
      secondary: { main: isDark ? '#C9BAFF' : '#535F70', contrastText: isDark ? '#12101E' : '#FFFFFF' },
      warning:   {
        main:  isDark ? '#FFB74D' : '#C17000',
        dark:  isDark ? '#FFD082' : undefined,   // readable amber on dark bg; day auto-calculated
      },
      error:     { main: isDark ? '#F28B82' : '#BA1A1A' },
      success:   { main: isDark ? '#81C995' : '#1B7A4E' },
      background: {
        default: isDark ? '#12101E' : '#F7F9FF',
        paper:   isDark ? '#1D1A2C' : '#FFFFFF',
      },
      grey: { 50: g50, 100: g100, 200: g200 },
      divider,
    },
    typography: {
      fontFamily: 'Roboto, system-ui, "Segoe UI", sans-serif',
      h1: { fontWeight: 400 },
      h2: { fontWeight: 500 },
      h3: { fontWeight: 500 },
      subtitle2: { fontWeight: 600, letterSpacing: '0.1px' },
    },
    shape: { borderRadius: 12 },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { backgroundColor: isDark ? '#08061A' : '#C8D0DC' },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: { textTransform: 'none', fontWeight: 500, borderRadius: 20, letterSpacing: '0.1px' },
          contained: {
            boxShadow: `0 1px 2px ${btnShadow}`,
            '&:hover': { boxShadow: `0 2px 6px ${btnShadow}` },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 600, borderRadius: 12, fontSize: 12 },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            fontWeight: 700,
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
            backgroundColor: g100,
            color: headColor,
            whiteSpace: 'normal',
            lineHeight: 1.4,
            borderBottom: `1px solid ${divider}`,
          },
          body: { fontSize: 13, whiteSpace: 'nowrap', color: bodyColor },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: { '&:hover': { backgroundColor: rowHover } },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
          outlined: { borderColor: divider },
          elevation1: {
            boxShadow: isDark
              ? '0 1px 3px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)'
              : '0 1px 2px rgba(0,28,90,0.12), 0 2px 8px rgba(0,28,90,0.06)',
          },
        },
      },
      MuiCard: {
        styleOverrides: { root: { borderRadius: 16 } },
      },
      MuiDialog: {
        styleOverrides: { paper: { borderRadius: 28 } },
      },
      MuiDialogTitle: {
        styleOverrides: { root: { fontWeight: 500, fontSize: 18 } },
      },
      MuiTabs: {
        styleOverrides: {
          root: { minHeight: 44 },
          indicator: { backgroundColor: primary, height: 2, borderRadius: 1 },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 500,
            fontSize: 14,
            letterSpacing: '0.1px',
            minHeight: 44,
            padding: '8px 20px',
            '&.Mui-selected': { color: primary, fontWeight: 600 },
          },
        },
      },
      MuiAlert: {
        styleOverrides: { root: { borderRadius: 12 } },
      },
      MuiCheckbox: {
        styleOverrides: {
          root: { '&.Mui-checked': { color: primary } },
        },
      },
    },
  })
}

export const dayTheme   = makeTheme(false)
export const nightTheme = makeTheme(true)

export default dayTheme
