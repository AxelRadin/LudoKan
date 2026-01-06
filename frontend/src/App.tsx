import { Outlet } from 'react-router-dom';
import Header from './components/Header';
import useAuth from './hooks/useAuth';

const App = () => {
  const { isAuthenticated } = useAuth();
  return (
    <>
      <Header isAuthenticated={isAuthenticated} />
      <Outlet />
    </>
  );
}

export default App;