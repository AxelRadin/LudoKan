import Box from '@mui/material/Box';
import { Outlet } from 'react-router-dom';
import Header from './components/Header';
import SettingsPage from './pages/SettingsPage';
import PolitiquesPage from './pages/PolitiquesPage';
import './App.css';

const App = () => {
  return (
    <>
      <Header />
      <Box component="main" sx={{ paddingTop: 8 }}>
        <Outlet />
      </Box>
    </>
  );
};

export default App;
