import { Outlet } from 'react-router-dom';
import Header from './components/Header';
import SearchWithSuggestionsPage from "./pages/SearchWithSuggestionsPage";
import "./App.css";



const App = () => {
  return (
    <>
      <Header />
      <Outlet />
      <SearchWithSuggestionsPage />
    </>
  );
};

export default App;
