import React, { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import ludokanLogo from '../assets/logo.png';
import { apiGet, apiPatch, apiPost } from '../services/api';

type User = {
  first_name?: string;
  last_name?: string;
  email?: string;
  avatar_url?: string;
  descriptionCourte?: string;
  preferences?: string;
  comments_count?: number | null;
  rating?: number | null;
  friends_count?: number | null;
  total_games?: number | null;
  total_platforms?: number | null;
  finished_titles?: number | null;
};

const styles: Record<string, CSSProperties> = {
  // PAGE BLANCHE PLEINE HAUTEUR
  page: {
    minHeight: '100vh',
    backgroundColor: '#ffffff',
    margin: 0,
    paddingTop: 16,
    fontFamily:
      'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },

  // BARRE DU HAUT AVEC LOGO (responsive grâce à padding en vw)
  topbar: {
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
    objectFit: 'contain',
    display: 'block',
  },

  // CONTENEUR PRINCIPAL
  card: {
    width: '100%',
    maxWidth: 1100,
    backgroundColor: '#ffffff',
    paddingBottom: 40,
  },

  // BANDEAU + AVATAR
  hero: {
    borderTop: '1px solid #000',
    borderLeft: '1px solid #000',
    borderRight: '1px solid #000',
  },
  bannerWrapper: {
    position: 'relative',
  },
  bannerImg: {
    width: '100%',
    height: 260,
    maxHeight: '40vh',
    objectFit: 'cover',
    display: 'block',
  },
  avatarOverlay: {
    position: 'absolute',
    left: 24,
    bottom: 12,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    backgroundColor: '#000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: 28,
    fontWeight: 600,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  overlayTextBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    color: '#fff',
  },
  overlayPseudo: {
    fontWeight: 600,
    fontSize: 15,
  },
  editLink: {
    fontSize: 12,
    color: '#fff',
    background: '#000',
    borderRadius: 999,
    border: '1px solid #fff',
    padding: '2px 10px',
    cursor: 'pointer',
    alignSelf: 'flex-start',
  },

  // LIGNE N/A / 5 / 20 (responsive avec auto-fit)
  topStatsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    borderLeft: '1px solid #000',
    borderRight: '1px solid #000',
    borderBottom: '1px solid #000',
  },
  topStatCell: {
    padding: '14px 8px',
    textAlign: 'center',
    borderLeft: '1px solid #000',
  },
  topStatCellFirst: {
    borderLeft: 'none',
  },
  topStatValue: {
    fontSize: 18,
    marginBottom: 4,
  },
  topStatLabel: {
    fontSize: 13,
  },

  // CONTENU (padding en vw pour s’adapter)
  content: {
    padding: '24px 7vw 0',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 16,
  },

  // CARTES STATISTIQUES (auto-fit → 3 / 2 / 1 colonnes selon la largeur)
  statCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 24,
  },
  statCard: {
    border: '1px solid #000',
    borderRadius: 6,
    overflow: 'hidden',
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 13,
    borderBottom: '1px solid #000',
    padding: '8px 4px',
  },
  statValue: {
    fontSize: 20,
    padding: '12px 4px 14px',
  },

  // MESSAGES
  messages: {
    marginTop: 12,
    marginBottom: 4,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 14,
    marginBottom: 4,
  },
  successText: {
    color: '#047857',
    fontSize: 14,
  },

  // FORMULAIRE
  formSection: {
    marginTop: 32,
  },
  formTitle: {
    fontSize: 16,
    marginBottom: 10,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    maxWidth: 520,
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: 10,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  label: {
    fontSize: 13,
  },
  input: {
    border: '1px solid #d1d5db',
    borderRadius: 4,
    padding: '6px 8px',
    fontSize: 14,
    fontFamily: 'inherit',
  },
  textarea: {
    border: '1px solid #d1d5db',
    borderRadius: 4,
    padding: '6px 8px',
    fontSize: 14,
    fontFamily: 'inherit',
    resize: 'vertical',
  },
  formActions: {
    marginTop: 8,
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  btn: {
    borderRadius: 4,
    padding: '6px 12px',
    fontSize: 14,
    border: 'none',
    cursor: 'pointer',
  },
  btnPrimary: {
    backgroundColor: '#111827',
    color: '#f9fafb',
  },
  btnSecondary: {
    backgroundColor: '#e5e7eb',
    color: '#111827',
  },
  btnDanger: {
    marginTop: 8,
    backgroundColor: '#dc2626',
    color: '#f9fafb',
  },

  // JEUX (wrap + responsive)
  gamesHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 12,
  },
  arrowBtn: {
    border: 'none',
    background: 'transparent',
    fontSize: 26,
    cursor: 'pointer',
  },
  gamesRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 16,
  },
  gameItem: {
    width: 120,
    height: 170,
    borderRadius: 4,
    overflow: 'hidden',
    flex: '0 0 auto',
  },
  gameImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
};

const PageProfile: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    avatar_url: '',
    descriptionCourte: '',
    preferences: '',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // GET /api/me
  useEffect(() => {
    const fetchMe = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('token');
        const data: User = await apiGet('/api/me', {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        setUser(data);
        setForm({
          first_name: data.first_name ?? '',
          last_name: data.last_name ?? '',
          email: data.email ?? '',
          avatar_url: data.avatar_url ?? '',
          descriptionCourte: data.descriptionCourte ?? '',
          preferences: data.preferences ?? '',
        });
      } catch (e: any) {
        setError(e.message ?? 'Erreur inattendue.');
      } finally {
        setLoading(false);
      }
    };

    fetchMe();
  }, []);

  const fullName =
    `${form.first_name} ${form.last_name}`.trim() || 'Pseudo utilisateur';

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // PATCH /api/me
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (user && form.email !== (user.email ?? '')) {
      const ok = window.confirm(
        'Tu es sur le point de modifier ton adresse e-mail. Continuer ?'
      );
      if (!ok) return;
    }

    try {
      setSaving(true);

      const token = localStorage.getItem('token');
      const updated: User = await apiPatch('/api/me', form, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      setUser(updated);
      setMessage('Profil mis à jour ✅');
      setIsEditing(false);
    } catch (e: any) {
      setError(e.message ?? 'Erreur inattendue.');
    } finally {
      setSaving(false);
    }
  };

  // POST /api/reset-password
  const handleResetPassword = async () => {
    setError(null);
    setMessage(null);

    if (!form.email) {
      setError(
        'Aucune adresse e-mail renseignée pour réinitialiser le mot de passe.'
      );
      return;
    }

    const ok = window.confirm(
      'Un e-mail de réinitialisation sera envoyé à cette adresse. Continuer ?'
    );
    if (!ok) return;

    try {
      await apiPost('/api/reset-password', { email: form.email });
      setMessage('E-mail de réinitialisation envoyé 📧');
    } catch (e: any) {
      setError(e.message ?? 'Erreur inattendue.');
    }
  };

  // jaquettes juste pour la maquette
  const games = [
    'https://image.api.playstation.com/cdn/EP9000/CUSA08342_00/6hOJtV8LojRxurx8zS7imLwY2zLsyO2V.png',
    'https://static.fnac-static.com/multimedia/Images/FR/MDM/40/ae/85/8851776/1540-1/tsp20221117101644/The-Legend-of-Zelda-Breath-of-the-Wild-Nintendo-Switch.jpg',
    'https://image.api.playstation.com/vulcan/ap/rnd/202008/2420/Ew0uxnxOQk1GDIsdbKwvKq49.png',
    'https://image.api.playstation.com/cdn/EP0700/CUSA00572_00/oUPj6vD2vuzk5vW7NQ2Ad2QdNCz7L3Uq.png',
    'https://image.api.playstation.com/cdn/UP0700/CUSA05933_00/lxaZ6UiHqdP1M1kwFevkpawuO/8fT0HZEvYe5UEQyAQ5GSz4.png',
    'https://image.api.playstation.com/cdn/UP0001/CUSA02152_00/h1JtVw2FCpfvzNwZ7nHU8pUB7G4qKzjL.png',
  ];

  if (loading) {
    return <div style={styles.page}>Chargement du profil…</div>;
  }

  return (
    <div style={styles.page}>
      {/* Logo */}
      <header style={styles.topbar}>
        <img src={ludokanLogo} alt="Logo" style={styles.logoImg} />
      </header>

      {/* Contenu principal */}
      <div style={styles.card}>
        {/* Bandeau Zelda + avatar */}
        <section style={styles.hero}>
          <div style={styles.bannerWrapper}>
            <img
              style={styles.bannerImg}
              src="https://images8.alphacoders.com/948/948964.jpg"
              alt="The Legend of Zelda"
            />

            <div style={styles.avatarOverlay}>
              <div style={styles.avatarCircle}>
                {form.avatar_url ? (
                  <img
                    src={form.avatar_url}
                    alt="Avatar"
                    style={styles.avatarImg}
                  />
                ) : (
                  <span>{fullName[0] || '?'}</span>
                )}
              </div>
              <div style={styles.overlayTextBlock}>
                <span style={styles.overlayPseudo}>{fullName}</span>
                <button
                  type="button"
                  style={styles.editLink}
                  onClick={() => setIsEditing(v => !v)}
                >
                  {isEditing ? 'Annuler' : 'Modifier'}
                </button>
              </div>
            </div>
          </div>

          {/* N/A / 5 / 20 */}
          <div style={styles.topStatsRow}>
            <div
              style={{
                ...styles.topStatCell,
                ...styles.topStatCellFirst,
              }}
            >
              <div style={styles.topStatValue}>
                {user?.comments_count ?? 'N/A'}
              </div>
              <div style={styles.topStatLabel}>Commentaires</div>
            </div>
            <div style={styles.topStatCell}>
              <div style={styles.topStatValue}>{user?.rating ?? '5'}</div>
              <div style={styles.topStatLabel}>Notation</div>
            </div>
            <div style={styles.topStatCell}>
              <div style={styles.topStatValue}>{user?.friends_count ?? 20}</div>
              <div style={styles.topStatLabel}>Amis</div>
            </div>
          </div>
        </section>

        <div style={styles.content}>
          {(error || message) && (
            <div style={styles.messages}>
              {error && <div style={styles.errorText}>{error}</div>}
              {message && <div style={styles.successText}>{message}</div>}
            </div>
          )}

          {/* Statistiques */}
          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>Statistiques</h2>
            <div style={styles.statCards}>
              <div style={styles.statCard}>
                <div style={styles.statLabel}>Total de jeux</div>
                <div style={styles.statValue}>{user?.total_games ?? 20}</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statLabel}>Total des plateformes</div>
                <div style={styles.statValue}>{user?.total_platforms ?? 4}</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statLabel}>Titres terminés</div>
                <div style={styles.statValue}>
                  {user?.finished_titles ?? 'N/A'}
                </div>
              </div>
            </div>
          </section>

          {/* Formulaire d'édition */}
          {isEditing && (
            <section style={styles.formSection}>
              <h3 style={styles.formTitle}>Mes informations</h3>
              <form style={styles.form} onSubmit={handleSave}>
                <div style={styles.formRow}>
                  <div style={styles.field}>
                    <label style={styles.label}>Prénom</label>
                    <input
                      style={styles.input}
                      name="first_name"
                      value={form.first_name}
                      onChange={handleChange}
                    />
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>Nom</label>
                    <input
                      style={styles.input}
                      name="last_name"
                      value={form.last_name}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>Email</label>
                  <input
                    type="email"
                    style={styles.input}
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>URL de l’avatar</label>
                  <input
                    style={styles.input}
                    name="avatar_url"
                    value={form.avatar_url}
                    onChange={handleChange}
                    placeholder="https://..."
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>Description courte</label>
                  <textarea
                    style={styles.textarea}
                    rows={2}
                    name="descriptionCourte"
                    value={form.descriptionCourte}
                    onChange={handleChange}
                    placeholder="Parle un peu de toi..."
                  />
                </div>

                <div style={styles.field}>
                  <label style={styles.label}>Préférences</label>
                  <textarea
                    style={styles.textarea}
                    rows={2}
                    name="preferences"
                    value={form.preferences}
                    onChange={handleChange}
                    placeholder="Ex : PC, Switch, RPG, jeux narratifs…"
                  />
                </div>

                <div style={styles.formActions}>
                  <button
                    type="button"
                    style={{ ...styles.btn, ...styles.btnSecondary }}
                    onClick={() => setIsEditing(false)}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    style={{ ...styles.btn, ...styles.btnPrimary }}
                    disabled={saving}
                  >
                    {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                  </button>
                </div>
              </form>

              <button
                type="button"
                style={{ ...styles.btn, ...styles.btnDanger }}
                onClick={handleResetPassword}
              >
                Réinitialiser mon mot de passe
              </button>
            </section>
          )}

          {/* Jeux (maquette) */}
          <section style={styles.section}>
            <div style={styles.gamesHeader}>
              <h2 style={styles.sectionTitle}>Jeux</h2>
              <button style={styles.arrowBtn}>{'>'}</button>
            </div>
            <div style={styles.gamesRow}>
              {games.map((src, index) => (
                <div key={index} style={styles.gameItem}>
                  <img
                    src={src}
                    alt={`Jeu ${index + 1}`}
                    style={styles.gameImg}
                  />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PageProfile;
