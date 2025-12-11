import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './App.css';
import reactLogo from './assets/react.svg';
import BackendConnector from './components/BackendConnector';
import viteLogo from '/vite.svg';

function App() {
  const [count, setCount] = useState(0);
  const navigate = useNavigate();

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => navigate('/home')} style={{ color: 'white' }}>
          Aller à Home
        </button>
        <button onClick={() => navigate('/Game')} style={{ color: 'white' }}>
          Accéder à GamePage
        </button>
        <button onClick={() => navigate('/profile')} style={{ color: 'white' }}>
          Accéder à ProfilePage
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
      <BackendConnector />
    </>
  );
}

export default App;
