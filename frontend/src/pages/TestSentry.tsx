export default function TestSentry() {
  return (
    <div style={{ padding: 16 }}>
      <h1>Page de test Sentry</h1>
      <p>Cliquez pour générer une erreur capturée par Sentry.</p>
      <button
        onClick={() => {
          throw new Error('Test Sentry Frontend');
        }}
      >
        Déclencher une erreur
      </button>
    </div>
  );
}


