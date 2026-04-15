import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  palette: {
    primary:   { main: '#16a34a' },  // green
    secondary: { main: '#4f46e5' },  // indigo
    warning:   { main: '#d97706' },  // amber
    error:     { main: '#dc2626' },
    success:   { main: '#16a34a' },
  },
  typography: {
    fontFamily: 'system-ui, "Segoe UI", Roboto, sans-serif',
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 700 },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 700,
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          backgroundColor: '#f8fafc',
          color: '#475569',
          whiteSpace: 'nowrap',
        },
        body: {
          fontSize: 13,
          whiteSpace: 'nowrap',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 14 },
      },
    },
  },
})

export default theme
