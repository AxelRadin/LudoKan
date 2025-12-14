import React, { CSSProperties } from "react";
import ludokanLogo from "../assets/logo.png"; 

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#ffffff",
    margin: 0,
    paddingTop: 16,
    fontFamily:
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  header: {
    width: "100%",
    maxWidth: 1100,
    padding: "0 5vw 8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  logoImg: {
    maxHeight: 70,
    width: "auto",
    objectFit: "contain",
    display: "block",
  },
  main: {
    flex: 1,
    width: "100%",
    maxWidth: 1100,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: "0 5vw 40px",
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
  return (
    <div style={styles.page}>
      {/* Logo en haut à gauche */}
      <header style={styles.header}>
        <img src={ludokanLogo} alt="Logo" style={styles.logoImg} />
      </header>

      {/* Contenu centré */}
      <main style={styles.main}>
        <h1 style={styles.title}>Error 404</h1>
        <p style={styles.subtitle}>
          Il semble qu&apos;un <br />
          problème soit survenu
        </p>
      </main>
    </div>
  );
};

export default Error404;
