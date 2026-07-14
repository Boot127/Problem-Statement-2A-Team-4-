import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import theme from './theme/theme';
import DashboardLayout from './components/layout/DashboardLayout';
import AppRoutes from './routes/AppRoutes';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <DashboardLayout>
          <AppRoutes />
        </DashboardLayout>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
