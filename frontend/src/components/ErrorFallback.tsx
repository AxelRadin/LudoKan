type Props = { error?: unknown; resetError?: () => void };

export default function ErrorFallback({ error, resetError }: Props) {
  return (
    <div style={{ padding: 16 }}>
      <h2>Une erreur est survenue</h2>
      {error ? <pre style={{ whiteSpace: 'pre-wrap' }}>{String(error)}</pre> : null}
      <button onClick={resetError}>Recharger</button>
    </div>
  );
}


