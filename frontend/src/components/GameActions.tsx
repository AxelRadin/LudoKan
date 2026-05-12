import BookmarkIcon from '@mui/icons-material/Bookmark';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import { Box, Button, Tooltip, Typography } from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/useAuth';
import type { GamePageLogic } from '../hooks/useGamePageLogic';
import type { NormalizedGame } from '../types/game';
import type { GamePageAppearance } from '../pages/gamePageAppearance';
import { GAME_PAGE_FONT } from '../pages/gamePageAppearance';
import { FavoriteGlyph, Sep, StatusChip } from '../pages/GamePageFragments';
import SecondaryButton from './SecondaryButton';
import { AddToCollectionModal } from './UserCollectionModals';
import { SectionAccentTitle } from './SectionAccentTitle';

type GameActionsProps = Readonly<{
  game: NormalizedGame;
  logic: GamePageLogic;
  appearance: GamePageAppearance;
}>;

export default function GameActions({
  game,
  logic,
  appearance,
}: GameActionsProps) {
  const { t } = useTranslation();
  const { card, redBtnSx, accent, muted } = appearance;
  const isFavorite = Boolean(logic.userGame?.is_favorite);
  const isSolo = game.max_players === 1;
  const { isAuthenticated, setAuthModalOpen, setPendingAction } = useAuth();
  const [collectionModalOpen, setCollectionModalOpen] = useState(false);

  const openCollectionModal = () => setCollectionModalOpen(true);

  const requireAuthForCollection = () => {
    setPendingAction(() => () => setCollectionModalOpen(true));
    setAuthModalOpen(true);
  };

  const onAddToCollectionClick = () => {
    if (!isAuthenticated) {
      requireAuthForCollection();
      return;
    }
    openCollectionModal();
  };

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <Box className="gp-c0" sx={{ ...card(), px: 2.5, py: 2.5 }}>
      <SectionAccentTitle label={t('gamePageBody.actionsLabel')} />
      <Box
        sx={{
          display: 'flex',
          gap: 1.5,
          flexWrap: 'wrap',
          mb: 2.5,
          alignItems: 'center',
        }}
      >
        <Tooltip
          title={isSolo ? 'Ce jeu est solo' : ''}
          arrow
          disableHoverListener={!isSolo}
        >
          <span>
            <SecondaryButton
              onClick={() => logic.handleSetMatchmaking()}
              disabled={logic.isMatching || isSolo}
            >
              {logic.isMatching
                ? t('gamePageBody.searching')
                : t('gamePageBody.matchmaking')}
            </SecondaryButton>
          </span>
        </Tooltip>
        <Button
          variant="contained"
          onClick={onAddToCollectionClick}
          sx={redBtnSx}
        >
          {t('gamePageBody.addToCollection')}
        </Button>

        {/* Shortcut to Review/Rate */}
        <Button
          size="small"
          startIcon={<StarBorderIcon />}
          onClick={() => scrollTo('reviews-section')}
          sx={{
            ml: { md: 'auto' }, // Push to the right on desktop
            textTransform: 'none',
            fontFamily: GAME_PAGE_FONT,
            fontWeight: 700,
            fontSize: 13,
            color: accent,
            borderRadius: '10px',
            px: 2,
            py: 1,
            bgcolor: `${accent}10`,
            '&:hover': { bgcolor: `${accent}18` },
          }}
        >
          {t('gamePageBody.actionRate')}
        </Button>
      </Box>

      <AddToCollectionModal
        open={collectionModalOpen}
        onClose={() => setCollectionModalOpen(false)}
        djangoGameId={logic.djangoId}
        ensureDjangoId={logic.ensureDjangoId}
        isAuthenticated={isAuthenticated}
        onRequireAuth={requireAuthForCollection}
        userGameHint={logic.userGame}
        onApplied={logic.refreshUserLibrary}
      />

      <Sep />

      <SectionAccentTitle label={t('gamePageBody.statusLabel')} />
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
        <StatusChip
          icon={<CheckCircleIcon />}
          label={t('gamePageBody.statusDone')}
          active={logic.userGame?.status === 'TERMINE'}
          color="#43a047"
          onClick={() => logic.handleSetStatus('TERMINE')}
        />
        <StatusChip
          icon={<PlayCircleIcon />}
          label={t('gamePageBody.statusPlaying')}
          active={logic.userGame?.status === 'EN_COURS'}
          color={accent}
          onClick={() => logic.handleSetStatus('EN_COURS')}
        />
        <StatusChip
          icon={<BookmarkIcon />}
          label={t('gamePageBody.statusWishlist')}
          active={logic.userGame?.status === 'ENVIE_DE_JOUER'}
          color="#fb8c00"
          onClick={() => logic.handleSetStatus('ENVIE_DE_JOUER')}
        />

        <Tooltip title={t('gamePageBody.favoriteTooltip')} arrow>
          <Box
            onClick={() => logic.handleToggleFavorite()}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.6,
              px: 1.5,
              py: 0.7,
              borderRadius: '12px',
              cursor: 'pointer',
              background: isFavorite
                ? 'rgba(255,61,61,0.12)'
                : 'rgba(0,0,0,0.03)',
              border: isFavorite
                ? '1px solid rgba(255,61,61,0.35)'
                : '1px solid rgba(0,0,0,0.06)',
              color: isFavorite ? accent : muted,
              transition: 'all 0.18s ease',
              '&:hover': {
                background: 'rgba(255,61,61,0.10)',
                color: accent,
                transform: 'translateY(-1px)',
              },
            }}
          >
            <FavoriteGlyph
              isFavorite={isFavorite}
              accent={accent}
              size={14}
              color="inherit"
            />
            <Typography
              sx={{
                fontFamily: GAME_PAGE_FONT,
                fontSize: 12.5,
                fontWeight: isFavorite ? 700 : 500,
                color: 'inherit',
              }}
            >
              {t('gamePageBody.favorite')}
            </Typography>
          </Box>
        </Tooltip>
      </Box>
    </Box>
  );
}
