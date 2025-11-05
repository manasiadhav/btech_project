import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#1f2937',
    },
    secondary: {
      main: '#60a5fa',
    },
    background: {
      default: '#f3f4f6',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: 'Inter, Arial, sans-serif',
  },
  components: {
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#1f2937',
          color: 'white',
        },
      },
    },
  },
});