// Fichier de test pour pre-commit (ESLint + Prettier)
// Ce fichier contient volontairement des erreurs de formatage

import React from 'react';
import { useState } from 'react';

// Mauvais formatage : double quotes, pas de point-virgule, espacement incohérent
const TestPreCommit = () => {
  const [count, setCount] = useState(0);
  const [text, setText] = useState('test');

  // Fonction mal formatée
  const handleClick = () => {
    setCount(count + 1);
    console.log('Click!');
  };

  const handleReset = () => {
    setCount(0);
    setText('reset');
  };

  // Objet mal formaté (utilisé dans le JSX)
  const config = {
    name: 'test',
    value: 123,
    enabled: true,
    nested: { deep: { value: 456 } },
  };

  return (
    <div>
      <h2>Test Pre-Commit</h2>
      <p>Count: {count}</p>
      <p>Text: {text}</p>
      <button onClick={handleClick}>Increment</button>
      <button onClick={handleReset}>Reset</button>

      {/* Liste mal formatée */}
      <ul>
        <li>Item 1</li>
        <li>Item 2</li>
        <li>Item 3</li>
      </ul>

      {/* Condition mal formatée */}
      {count > 5 ? (
        <div>Count is greater than 5</div>
      ) : (
        <div>Count is less than or equal to 5</div>
      )}

      {/* Array mal formaté */}
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n}>{n}</span>
      ))}

      {/* Config utilisé ici */}
      <pre>{JSON.stringify(config, null, 2)}</pre>
    </div>
  );
};

export default TestPreCommit;
