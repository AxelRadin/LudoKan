import { Outlet } from 'react-router-dom';
import Header from './components/Header';
import "./App.css";



const App = () => {
  return (
    <>
      <Header />
      <Outlet />
    </>
  );
};

export default App;
