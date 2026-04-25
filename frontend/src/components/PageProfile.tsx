import React, { useEffect, useState } from 'react';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import { useTranslation } from 'react-i18next';
import ludokanLogo from '../assets/logo.png';
import { apiGet, apiPatch, apiPost } from '../services/api';

type User = {
  first_name?: string;
  last_name?: string;
  email?: string;
  avatar_url?: string;
  banner_url?: string;
  descriptionCourte?: string;
  preferences?: string;
  comments_count?: number | null;
  rating?: number | null;
  friends_count?: number | null;
  total_games?: number | null;
  total_platforms?: number | null;
  finished_titles?: number | null;
};

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
    objectFit: 'contain' as const,
    display: 'block',
  },
  card: {
    width: '100%',
    maxWidth: 1100,
    backgroundColor: '#ffffff',
    paddingBottom: 40,
  },
  hero: {
    borderTop: '1px solid #000',
    borderLeft: '1px solid #000',
    borderRight: '1px solid #000',
  },
  bannerWrapper: {
    position: 'relative' as const,
  },
  bannerImg: {
    width: '100%',
    height: 260,
    maxHeight: '40vh',
    objectFit: 'cover' as const,
    display: 'block',
  },
  bannerCameraBtn: {
    position: 'absolute' as const,
    top: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    color: '#fff',
    border: 'none',
    borderRadius: '50%',
    width: 40,
    height: 40,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 2,
  },
  avatarOverlay: {
    position: 'absolute' as const,
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
    objectFit: 'cover' as const,
  },
  overlayTextBlock: {
    display: 'flex',
    flexDirection: 'column' as const,
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
    alignSelf: 'flex-start' as const,
  },
  topStatsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    borderLeft: '1px solid #000',
    borderRight: '1px solid #000',
    borderBottom: '1px solid #000',
  },
  topStatCell: {
    padding: '14px 8px',
    textAlign: 'center' as const,
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
  statCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 24,
  },
  statCard: {
    border: '1px solid #000',
    borderRadius: 6,
    overflow: 'hidden',
    textAlign: 'center' as const,
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
  formSection: {
    marginTop: 32,
  },
  formTitle: {
    fontSize: 16,
    marginBottom: 10,
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
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
    flexDirection: 'column' as const,
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
    resize: 'vertical' as const,
  },
  formActions: {
    marginTop: 8,
    display: 'flex',
    flexWrap: 'wrap' as const,
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
    flexWrap: 'wrap' as const,
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
    objectFit: 'cover' as const,
  },
};

const PageProfile: React.FC = () => {
  const { t } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    avatar_url: '',
    banner_url: '',
    descriptionCourte: '',
    preferences: '',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const bannerInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchMe = async () => {
      try {
        setLoading(true);
        setError(null);
        const data: User = await apiGet('/api/me', {
          headers: { 'Content-Type': 'application/json' },
        });
        setUser(data);
        setForm({
          first_name: data.first_name ?? '',
          last_name: data.last_name ?? '',
          email: data.email ?? '',
          avatar_url: data.avatar_url ?? '',
          banner_url: data.banner_url ?? '',
          descriptionCourte: data.descriptionCourte ?? '',
          preferences: data.preferences ?? '',
        });
      } catch (e: any) {
        setError(e.message ?? t('profile.unexpectedError'));
      } finally {
        setLoading(false);
      }
    };
    fetchMe();
  }, [t]);

  const fullName =
    `${form.first_name} ${form.last_name}`.trim() || t('profile.defaultName');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (user && form.email !== (user.email ?? '')) {
      if (!globalThis.confirm(t('profile.confirmEmail'))) return;
    }
    try {
      setSaving(true);
      const updated: User = await apiPatch('/api/me', form, { headers: {} });
      setUser(updated);
      setMessage(t('profile.profileUpdated'));
      setIsEditing(false);
    } catch (e: any) {
      setError(e.message ?? t('profile.unexpectedError'));
    } finally {
      setSaving(false);
    }
  };

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('banner', file);
    try {
      setUploadingBanner(true);
      setError(null);
      const updated: User = await apiPatch('/api/me', formData);
      setUser(updated);
      setForm(prev => ({ ...prev, banner_url: updated.banner_url ?? '' }));
      setMessage(t('profile.bannerUpdated'));
    } catch (e: any) {
      setError(e.message ?? t('profile.bannerError'));
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleResetPassword = async () => {
    setError(null);
    setMessage(null);
    if (!form.email) {
      setError(t('profile.unexpectedError'));
      return;
    }
    if (!globalThis.confirm(t('profile.confirmReset'))) return;
    try {
      await apiPost('/api/reset-password', { email: form.email });
      setMessage(t('profile.resetSent'));
    } catch (e: any) {
      setError(e.message ?? t('profile.unexpectedError'));
    }
  };

  const games = [
    'https://image.api.playstation.com/cdn/EP9000/CUSA08342_00/6hOJtV8LojRxurx8zS7imLwY2zLsyO2V.png',
    'https://static.fnac-static.com/multimedia/Images/FR/MDM/40/ae/85/8851776/1540-1/tsp20221117101644/The-Legend-of-Zelda-Breath-of-the-Wild-Nintendo-Switch.jpg',
    'https://image.api.playstation.com/vulcan/ap/rnd/202008/2420/Ew0uxnxOQk1GDIsdbKwvKq49.png',
    'https://image.api.playstation.com/cdn/EP0700/CUSA00572_00/oUPj6vD2vuzk5vW7NQ2Ad2QdNCz7L3Uq.png',
    'https://image.api.playstation.com/cdn/UP0700/CUSA05933_00/lxaZ6UiHqdP1M1kwFevkpawuO/8fT0HZEvYe5UEQyAQ5GSz4.png',
    'https://image.api.playstation.com/cdn/UP0001/CUSA02152_00/h1JtVw2FCpfvzNwZ7nHU8pUB7G4qKzjL.png',
  ];

  if (loading) return <div style={styles.page}>{t('profile.loading')}</div>;

  return (
    <div style={styles.page}>
      <header style={styles.topbar}>
        <img src={ludokanLogo} alt="Logo" style={styles.logoImg} />
      </header>

      <div style={styles.card}>
        <section style={styles.hero}>
          <div style={styles.bannerWrapper}>
            {user && (
              <button
                type="button"
                style={styles.bannerCameraBtn}
                onClick={() => bannerInputRef.current?.click()}
                disabled={uploadingBanner}
                title={t('profile.editBanner')}
              >
                {uploadingBanner ? '⏳' : <CameraAltIcon fontSize="small" />}
              </button>
            )}
            <input
              type="file"
              ref={bannerInputRef}
              style={{ display: 'none' }}
              accept="image/png, image/jpeg, image/webp"
              onChange={handleBannerChange}
            />
            <img
              style={styles.bannerImg}
              src={
                user?.banner_url ||
                'https://images8.alphacoders.com/948/948964.jpg'
              }
              alt="Bannière de profil"
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
                  {isEditing ? t('profile.cancel') : t('profile.edit')}
                </button>
              </div>
            </div>
          </div>

          <div style={styles.topStatsRow}>
            <div style={{ ...styles.topStatCell, ...styles.topStatCellFirst }}>
              <div style={styles.topStatValue}>
                {user?.comments_count ?? 'N/A'}
              </div>
              <div style={styles.topStatLabel}>{t('profile.comments')}</div>
            </div>
            <div style={styles.topStatCell}>
              <div style={styles.topStatValue}>{user?.rating ?? '5'}</div>
              <div style={styles.topStatLabel}>{t('profile.rating')}</div>
            </div>
            <div style={styles.topStatCell}>
              <div style={styles.topStatValue}>{user?.friends_count ?? 20}</div>
              <div style={styles.topStatLabel}>{t('profile.friends')}</div>
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

          <section style={styles.section}>
            <h2 style={styles.sectionTitle}>{t('profile.stats')}</h2>
            <div style={styles.statCards}>
              <div style={styles.statCard}>
                <div style={styles.statLabel}>{t('profile.totalGames')}</div>
                <div style={styles.statValue}>{user?.total_games ?? 20}</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statLabel}>
                  {t('profile.totalPlatforms')}
                </div>
                <div style={styles.statValue}>{user?.total_platforms ?? 4}</div>
              </div>
              <div style={styles.statCard}>
                <div style={styles.statLabel}>
                  {t('profile.finishedTitles')}
                </div>
                <div style={styles.statValue}>
                  {user?.finished_titles ?? 'N/A'}
                </div>
              </div>
            </div>
          </section>

          {isEditing && (
            <section style={styles.formSection}>
              <h3 style={styles.formTitle}>{t('profile.myInfo')}</h3>
              <form style={styles.form} onSubmit={handleSave}>
                <div style={styles.formRow}>
                  <div style={styles.field}>
                    <label style={styles.label}>{t('profile.firstName')}</label>
                    <input
                      style={styles.input}
                      name="first_name"
                      value={form.first_name}
                      onChange={handleChange}
                    />
                  </div>
                  <div style={styles.field}>
                    <label style={styles.label}>{t('profile.lastName')}</label>
                    <input
                      style={styles.input}
                      name="last_name"
                      value={form.last_name}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>{t('profile.email')}</label>
                  <input
                    type="email"
                    style={styles.input}
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>{t('profile.avatarUrl')}</label>
                  <input
                    style={styles.input}
                    name="avatar_url"
                    value={form.avatar_url}
                    onChange={handleChange}
                    placeholder="https://..."
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>
                    {t('profile.shortDescription')}
                  </label>
                  <textarea
                    style={styles.textarea}
                    rows={2}
                    name="descriptionCourte"
                    value={form.descriptionCourte}
                    onChange={handleChange}
                    placeholder={t('profile.shortDescriptionPlaceholder')}
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>{t('profile.preferences')}</label>
                  <textarea
                    style={styles.textarea}
                    rows={2}
                    name="preferences"
                    value={form.preferences}
                    onChange={handleChange}
                    placeholder={t('profile.preferencesPlaceholder')}
                  />
                </div>
                <div style={styles.formActions}>
                  <button
                    type="button"
                    style={{ ...styles.btn, ...styles.btnSecondary }}
                    onClick={() => setIsEditing(false)}
                  >
                    {t('profile.cancel')}
                  </button>
                  <button
                    type="submit"
                    style={{ ...styles.btn, ...styles.btnPrimary }}
                    disabled={saving}
                  >
                    {saving ? t('profile.saving') : t('profile.save')}
                  </button>
                </div>
              </form>
              <button
                type="button"
                style={{ ...styles.btn, ...styles.btnDanger }}
                onClick={handleResetPassword}
              >
                {t('profile.resetPassword')}
              </button>
            </section>
          )}

          <section style={styles.section}>
            <div style={styles.gamesHeader}>
              <h2 style={styles.sectionTitle}>{t('profile.games')}</h2>
              <button style={styles.arrowBtn}>{'>'}</button>
            </div>
            <div style={styles.gamesRow}>
              {games.map((src, index) => (
                <div key={index} style={styles.gameItem}>
                  <img
                    src={src}
                    alt={t('profile.gameAlt', { index: index + 1 })}
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
