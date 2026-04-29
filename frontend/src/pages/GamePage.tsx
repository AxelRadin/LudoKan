import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { useGamePageLogic } from '../hooks/useGamePageLogic';
import { buildGamePageAppearance, GAME_PAGE_FONT } from './gamePageAppearance';
import { GamePageLoadedBody } from './GamePageLoadedBody';

(() => {
  const s = document.createElement('style');
  s.textContent = `
    @keyframes fadeUp  { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
    @keyframes scaleIn { from{opacity:0;transform:scale(0.93)} to{opacity:1;transform:scale(1)} }
    .gp-img { animation: scaleIn 0.7s cubic-bezier(0.22,1,0.36,1) both }
    .gp-c0  { animation: fadeUp  0.5s cubic-bezier(0.22,1,0.36,1) 0.08s both }
    .gp-c1  { animation: fadeUp  0.5s cubic-bezier(0.22,1,0.36,1) 0.16s both }
    .gp-c2  { animation: fadeUp  0.5s cubic-bezier(0.22,1,0.36,1) 0.24s both }
    .gp-c3  { animation: fadeUp  0.5s cubic-bezier(0.22,1,0.36,1) 0.32s both }
    .gp-c4  { animation: fadeUp  0.5s cubic-bezier(0.22,1,0.36,1) 0.40s both }
    .gp-c5  { animation: fadeUp  0.5s cubic-bezier(0.22,1,0.36,1) 0.48s both }
    .gp-c6  { animation: fadeUp  0.5s cubic-bezier(0.22,1,0.36,1) 0.56s both }
  `;
  document.head.appendChild(s);
})();

export default function GamePage() {
  const { t } = useTranslation();
  const logic = useGamePageLogic();
  const theme = useTheme();
  const appearance = buildGamePageAppearance(theme.palette.mode === 'dark');

  if (logic.gameNotFound || !logic.game) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: appearance.loadingBackground,
        }}
      >
        <Typography
          sx={{
            fontFamily: GAME_PAGE_FONT,
            fontWeight: 700,
            fontSize: 22,
            color: appearance.ink,
          }}
        >
          {logic.gameNotFound ? t('gamePage.notFound') : t('gamePage.loading')}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        fontFamily: GAME_PAGE_FONT,
        background: appearance.pageBackground,
        px: { xs: 2, md: 4, lg: 6 },
        py: { xs: 3, md: 5 },
      }}
    >
      <Box sx={{ maxWidth: 1140, mx: 'auto' }}>
        <GamePageLoadedBody logic={logic} appearance={appearance} />
      </Box>
    </Box>
  );
}
