import React from 'react';
import { useTranslation } from 'react-i18next';
import ludokanLogo from '../assets/logo.png';

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#ffffff',
    margin: 0,
    paddingTop: 16,
    fontFamily:
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
  },
  header: {
    width: '100%',
    maxWidth: 1100,
    padding: '0 5vw 8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  logoImg: {
    maxHeight: 70,
    width: 'auto',
    objectFit: 'contain' as const,
    display: 'block',
  },
  main: {
    flex: 1,
    width: '100%',
    maxWidth: 1100,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center' as const,
    padding: '0 5vw 40px',
  },
  title: {
    fontSize: 40,
    fontWeight: 700,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 18,
    lineHeight: 1.4,
  },
};

const Error404: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <img src={ludokanLogo} alt="Logo" style={styles.logoImg} />
      </header>
      <main style={styles.main}>
        <h1 style={styles.title}>{t('error404.title')}</h1>
        <p style={styles.subtitle}>{t('error404.subtitle')}</p>
      </main>
    </div>
  );
};

export default Error404;
