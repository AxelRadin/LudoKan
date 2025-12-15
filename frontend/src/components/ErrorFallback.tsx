import React from 'react';

type Props = Readonly<{
  error?: unknown;
  resetError?: () => void;
}>;

export default function ErrorFallback({ error, resetError }: Props) {
  let display = 'Une erreur inconnue est survenue';

  if (error instanceof Error) {
    display = error.message;
  } else if (typeof error === 'string') {
    display = error;
  } else if (error) {
    display = JSON.stringify(error, null, 2);
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Une erreur est survenue</h2>
      <pre style={{ whiteSpace: 'pre-wrap' }}>{display}</pre>
      <button onClick={resetError}>Recharger</button>
    </div>
  );
}
