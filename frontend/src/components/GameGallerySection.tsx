import { Box, Modal, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { NormalizedGame } from '../types/game';
import type { GamePageLogic } from '../hooks/useGamePageLogic';
import type { GamePageAppearance } from '../pages/gamePageAppearance';
import { GAME_PAGE_FONT } from '../pages/gamePageAppearance';
import { SectionAccentTitle } from './SectionAccentTitle';
import { Sep } from '../pages/GamePageFragments';

type GameGallerySectionProps = Readonly<{
  game: NormalizedGame;
  logic: GamePageLogic;
  appearance: GamePageAppearance;
}>;

export default function GameGallerySection({
  game,
  logic,
  appearance,
}: GameGallerySectionProps) {
  const { t } = useTranslation();
  const { card, noHov, accentGlow, ink } = appearance;
  const videos = game.videos ?? [];
  const screenshots = game.screenshots ?? [];

  if (videos.length === 0 && screenshots.length === 0) return null;

  return (
    <Box
      className="gp-c5"
      sx={{ ...card(noHov), p: { xs: '20px', md: '26px 30px' }, mb: 2 }}
    >
      <SectionAccentTitle label={t('gamePageBody.galleryLabel')} />
      <Typography
        sx={{
          fontFamily: GAME_PAGE_FONT,
          fontWeight: 700,
          fontSize: 18,
          color: ink,
          letterSpacing: -0.3,
          mb: 0.5,
        }}
      >
        {t('gamePageBody.mediaLabel')}
      </Typography>
      <Sep />

      {videos.length > 0 && (
        <Box sx={{ mb: 2.5 }}>
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              maxWidth: '100%',
              aspectRatio: '16/9',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: `0 8px 28px rgba(0,0,0,0.14), 0 0 0 1px ${accentGlow}`,
            }}
          >
            <iframe
              src={`https://www.youtube.com/embed/${videos[0].video_id}`}
              title={videos[0].name || 'Trailer'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                border: 'none',
              }}
            />
          </Box>
        </Box>
      )}

      {screenshots.length > 0 && (
        <Box
          sx={{
            display: 'flex',
            gap: 1.5,
            overflowX: 'auto',
            pb: 1,
            '&::-webkit-scrollbar': { height: 4 },
            '&::-webkit-scrollbar-thumb': {
              borderRadius: 99,
              bgcolor: accentGlow,
            },
          }}
        >
          {screenshots.map(s => (
            <Box
              key={s.url}
              component="img"
              src={s.url}
              alt={
                game.name
                  ? t('gamePageBody.screenshotAlt', { name: game.name })
                  : t('gamePageBody.screenshotAltFallback')
              }
              onClick={() => logic.setSelectedShot(s.url)}
              sx={{
                height: { xs: 130, sm: 185 },
                minWidth: { xs: 200, sm: 295 },
                objectFit: 'cover',
                borderRadius: '12px',
                boxShadow: `0 3px 10px rgba(0,0,0,0.08), 0 0 0 1px ${accentGlow}`,
                flexShrink: 0,
                cursor: 'pointer',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                '&:hover': {
                  transform: 'scale(1.03)',
                  boxShadow: '0 8px 24px rgba(198,40,40,0.15)',
                },
              }}
            />
          ))}
        </Box>
      )}

      {logic.selectedShot && (
        <Modal open onClose={() => logic.setSelectedShot(null)}>
          <Box
            onClick={() => logic.setSelectedShot(null)}
            sx={{
              position: 'fixed',
              inset: 0,
              bgcolor: 'rgba(0,0,0,0.92)',
              backdropFilter: 'blur(14px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'zoom-out',
            }}
          >
            <Box
              component="img"
              src={logic.selectedShot}
              alt={t('gamePageBody.screenshotEnlarged')}
              sx={{
                maxWidth: '90vw',
                maxHeight: '90vh',
                borderRadius: '16px',
                boxShadow: '0 28px 80px rgba(0,0,0,0.6)',
              }}
            />
          </Box>
        </Modal>
      )}
    </Box>
  );
}
