import { useTranslation } from 'react-i18next';

type Props = Readonly<{
  error?: unknown;
  resetError?: () => void;
}>;

export default function ErrorFallback({ error, resetError }: Props) {
  const { t } = useTranslation();

  let display = t('errorFallback.unknown');

  if (error instanceof Error) {
    display = error.message;
  } else if (typeof error === 'string') {
    display = error;
  } else if (error) {
    display = JSON.stringify(error, null, 2);
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>{t('errorFallback.title')}</h2>
      <pre style={{ whiteSpace: 'pre-wrap' }}>{display}</pre>
      <button onClick={resetError}>{t('errorFallback.reload')}</button>
    </div>
  );
}
