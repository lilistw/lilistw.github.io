import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  palette: {
    primary:   { main: '#1A6DC8', contrastText: '#FFFFFF' },
    secondary: { main: '#535F70', contrastText: '#FFFFFF' },
    warning:   { main: '#C17000' },
    error:     { main: '#BA1A1A' },
    success:   { main: '#1B7A4E' },
    background: {
      default: '#F7F9FF',
      paper:   '#FFFFFF',
    },
    grey: {
      50:  '#F7F9FF',   // M3 surface-container
      100: '#ECF0FA',
      200: '#DFE2EB',
    },
    divider: '#C3C6CF',
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
        body: { backgroundColor: '#C8D0DC' },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          borderRadius: 20,
          letterSpacing: '0.1px',
        },
        contained: {
          boxShadow: '0 1px 2px rgba(0,28,90,0.3)',
          '&:hover': { boxShadow: '0 2px 6px rgba(0,28,90,0.3)' },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 12,
          fontSize: 12,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 700,
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          /* Light grey header — legible dark text */
          backgroundColor: '#ECF0FA',
          color: '#43474E',
          whiteSpace: 'normal',
          lineHeight: 1.4,
          borderBottom: '1px solid #C3C6CF',
        },
        body: {
          fontSize: 13,
          whiteSpace: 'nowrap',
          color: '#191C20',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: 'rgba(26,109,200,0.06)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        outlined: {
          borderColor: '#C3C6CF',
        },
        elevation1: {
          boxShadow: '0 1px 2px rgba(0,28,90,0.12), 0 2px 8px rgba(0,28,90,0.06)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 28 },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: { fontWeight: 500, fontSize: 18 },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: { minHeight: 44 },
        indicator: {
          backgroundColor: '#1A6DC8',
          height: 2,
          borderRadius: 1,
        },
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
          '&.Mui-selected': { color: '#1A6DC8', fontWeight: 600 },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 12 },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          '&.Mui-checked': { color: '#1A6DC8' },
        },
      },
    },
  },
})

export default theme
