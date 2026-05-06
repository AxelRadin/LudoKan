import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { useRecommendations } from '../hooks/useRecommendations';
import TrendingGames from './TrendingGames';

const F = "'Outfit', sans-serif";

const C = {
  accent: '#c62828',
  darkAccent: '#ef5350',
  ink: '#241818',
  darkInk: '#f5e6e6',
};

export function RecommendedGamesSection() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const accentColor = isDark ? C.darkAccent : C.accent;
  const inkColor = isDark ? C.darkInk : C.ink;

  const { games, loading } = useRecommendations();

  return (
    <Box sx={{ mb: 6 }}>
      <Box sx={{ mb: 3, pl: '18px' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
          <Box
            sx={{
              width: 18,
              height: '1px',
              background: accentColor,
              opacity: 0.6,
            }}
          />
          <Typography
            sx={{
              fontFamily: F,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 3,
              textTransform: 'uppercase',
              color: accentColor,
              opacity: 0.85,
            }}
          >
            Personnalisé
          </Typography>
        </Box>
        <Typography
          sx={{
            fontFamily: F,
            fontWeight: 700,
            fontSize: { xs: 24, md: 32 },
            color: inkColor,
            letterSpacing: -0.3,
            lineHeight: 1.15,
          }}
        >
          Suggestions pour vous
        </Typography>
      </Box>

      <TrendingGames games={games} loading={loading} />
    </Box>
  );
}

export default RecommendedGamesSection;
