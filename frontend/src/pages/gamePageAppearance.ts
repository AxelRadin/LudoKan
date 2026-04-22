/** Theme-derived tokens and style factories for the game detail page. */

export const GAME_PAGE_FONT = "'Outfit', sans-serif";

const PAGE_BG_DARK = `
              url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E"),
              radial-gradient(circle at 14% 18%, rgba(198,40,40,0.10) 0%, transparent 28%),
              radial-gradient(circle at 86% 16%, rgba(120,20,20,0.18) 0%, transparent 28%),
              radial-gradient(circle at 78% 84%, rgba(198,40,40,0.07) 0%, transparent 24%),
              linear-gradient(180deg, #1a1010 0%, #221414 55%, #1e1212 100%)
            `;

const PAGE_BG_LIGHT = `
              url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.022'/%3E%3C/svg%3E"),
              radial-gradient(ellipse 120% 80% at 0% 0%, rgba(255,255,255,0.92) 0%, transparent 46%),
              radial-gradient(circle at 14% 18%, rgba(198,40,40,0.10) 0%, transparent 24%),
              radial-gradient(circle at 86% 16%, rgba(255,210,210,0.80) 0%, transparent 26%),
              radial-gradient(circle at 78% 84%, rgba(198,40,40,0.08) 0%, transparent 24%),
              linear-gradient(180deg, #fdf4f4 0%, #f9ecec 55%, #fef6f6 100%)
            `;

export type GamePageAppearance = Readonly<{
  isDark: boolean;
  accent: string;
  accentDark: string;
  accentSoft: string;
  accentGlow: string;
  ink: string;
  muted: string;
  cardBg: string;
  cardBorder: string;
  pageBackground: string;
  loadingBackground: string;
  card: (ov?: Record<string, unknown>) => Record<string, unknown>;
  noHov: Record<string, unknown>;
  redBtnSx: Record<string, unknown>;
}>;

export function buildGamePageAppearance(isDark: boolean): GamePageAppearance {
  const accent = isDark ? '#ef5350' : '#d43c3c';
  const accentDark = isDark ? '#c62828' : '#b71c1c';
  const accentSoft = isDark ? 'rgba(239,83,80,0.12)' : 'rgba(198,40,40,0.08)';
  const accentGlow = isDark ? 'rgba(239,83,80,0.25)' : 'rgba(198,40,40,0.15)';
  const ink = isDark ? '#f5e6e6' : '#241818';
  const muted = isDark ? '#9e7070' : '#b49393';
  const cardBg = isDark ? 'rgba(40,20,20,0.65)' : 'rgba(255,255,255,0.80)';
  const cardBorder = isDark ? 'rgba(239,83,80,0.14)' : 'rgba(198,40,40,0.10)';

  const card = (ov: Record<string, unknown> = {}) => ({
    background: cardBg,
    backdropFilter: 'blur(24px) saturate(160%)',
    WebkitBackdropFilter: 'blur(24px) saturate(160%)',
    border: `1px solid ${cardBorder}`,
    borderRadius: '20px',
    boxShadow: isDark
      ? '0 4px 24px rgba(0,0,0,0.30)'
      : '0 4px 24px rgba(198,40,40,0.06)',
    transition:
      'transform 0.22s cubic-bezier(0.22,1,0.36,1), box-shadow 0.22s ease, border-color 0.22s ease',
    position: 'relative' as const,
    overflow: 'hidden' as const,
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: 20,
      right: 20,
      height: '1px',
      background: `linear-gradient(to right, ${accent} 0%, transparent 60%)`,
      opacity: isDark ? 0.5 : 0.35,
    },
    '&:hover': {
      transform: 'translateY(-2px)',
      borderColor: isDark ? 'rgba(239,83,80,0.28)' : 'rgba(198,40,40,0.22)',
      boxShadow: isDark
        ? '0 12px 36px rgba(239,83,80,0.12)'
        : '0 12px 36px rgba(198,40,40,0.10)',
    },
    ...ov,
  });

  const noHov = { '&:hover': { transform: 'none' } };

  const redBtnSx = {
    borderRadius: '12px',
    px: 2.5,
    py: 1,
    fontWeight: 700,
    fontSize: 13,
    textTransform: 'none' as const,
    fontFamily: GAME_PAGE_FONT,
    background: `linear-gradient(135deg, ${accent} 0%, #ef5350 100%)`,
    boxShadow: `0 4px 16px rgba(211,47,47,0.32)`,
    '&:hover': {
      background: `linear-gradient(135deg, ${accentDark} 0%, ${accent} 100%)`,
      transform: 'translateY(-2px)',
      boxShadow: `0 8px 22px rgba(211,47,47,0.42)`,
    },
    transition: 'all 0.2s ease',
  };

  return {
    isDark,
    accent,
    accentDark,
    accentSoft,
    accentGlow,
    ink,
    muted,
    cardBg,
    cardBorder,
    pageBackground: isDark ? PAGE_BG_DARK : PAGE_BG_LIGHT,
    loadingBackground: isDark ? '#1a1010' : '#fdf4f4',
    card,
    noHov,
    redBtnSx,
  };
}
