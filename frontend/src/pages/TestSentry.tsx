import { useTranslation } from 'react-i18next';

export default function TestSentry() {
  const { t } = useTranslation();

  return (
    <div style={{ padding: 16 }}>
      <h1>{t('testSentry.title')}</h1>
      <p>{t('testSentry.desc')}</p>
      <button
        onClick={() => {
          throw new Error('Test Sentry Frontend');
        }}
      >
        {t('testSentry.btn')}
      </button>
    </div>
  );
}
