import MoreVertIcon from '@mui/icons-material/MoreVert';
import {
  Box,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { GameListItem, GameListProps } from '../components/GameList';
import GameList from '../components/GameList';
import LibraryFilters from '../components/LibraryFilters';
import type { UserCollection } from '../api/collections';
import type {
  LibraryCollectionFilter,
  LibraryCounts,
  LibraryStatusFilter,
} from '../constants/libraryFilter';

type ProfilePageLibrarySectionProps = Readonly<{
  glassCard: Record<string, unknown>;
  /** Ombre au repos (même valeur que `glassCard.boxShadow`) pour désactiver l’effet hover sur ce bloc. */
  paperRestingBoxShadow: string;
  accent: string;
  titleColor: string;
  borderColor: string;
  libraryBadgeText: string;
  librarySectionMenuAnchor: null | HTMLElement;
  setLibrarySectionMenuAnchor: (el: null | HTMLElement) => void;
  setCreateCollectionModalOpen: (open: boolean) => void;
  setManageCollectionsModalOpen: (open: boolean) => void;
  libraryFilter: LibraryStatusFilter;
  setLibraryFilter: (next: LibraryStatusFilter) => void;
  libraryCounts: LibraryCounts;
  collections: UserCollection[];
  collectionFilterId: LibraryCollectionFilter;
  setLibraryCollectionFilter: (next: LibraryCollectionFilter) => void;
  collectionsLoading: boolean;
  gamesFavoris: GameListItem[];
  gamesEnCours: GameListItem[];
  gamesTermines: GameListItem[];
  gamesEnvie: GameListItem[];
  gamesForLibraryFilter: GameListItem[];
  singleFilterTitle: string;
  removeGame: (userGameId: number) => void;
  gameListCollectionProps: Partial<
    Pick<GameListProps, 'onDetachFromCollection' | 'detachFromCollectionTitle'>
  >;
  gamesLoading: boolean;
}>;

const FONT_BODY = "'DM Sans', system-ui, sans-serif";
const FONT_DISPLAY = "'Playfair Display', Georgia, serif";

export default function ProfilePageLibrarySection({
  glassCard,
  paperRestingBoxShadow,
  accent,
  titleColor,
  borderColor,
  libraryBadgeText,
  librarySectionMenuAnchor,
  setLibrarySectionMenuAnchor,
  setCreateCollectionModalOpen,
  setManageCollectionsModalOpen,
  libraryFilter,
  setLibraryFilter,
  libraryCounts,
  collections,
  collectionFilterId,
  setLibraryCollectionFilter,
  collectionsLoading,
  gamesFavoris,
  gamesEnCours,
  gamesTermines,
  gamesEnvie,
  gamesForLibraryFilter,
  singleFilterTitle,
  removeGame,
  gameListCollectionProps,
  gamesLoading,
}: ProfilePageLibrarySectionProps) {
  const { t } = useTranslation();

  const libraryLists =
    libraryFilter === 'ALL' ? (
      <>
        {[
          { games: gamesFavoris, label: t('profilePage.favorites') },
          {
            games: gamesEnCours,
            label: t('profilePage.statusPlaying'),
          },
          { games: gamesTermines, label: t('profilePage.statusDone') },
          { games: gamesEnvie, label: t('profilePage.statusWishlist') },
        ].map(({ games, label }) => (
          <GameList
            key={label}
            games={games}
            title={`${label} (${games.length})`}
            showStatus={false}
            onRemove={removeGame}
            {...gameListCollectionProps}
          />
        ))}
      </>
    ) : (
      <GameList
        games={gamesForLibraryFilter}
        title={`${singleFilterTitle} (${gamesForLibraryFilter.length})`}
        showStatus={false}
        onRemove={removeGame}
        {...gameListCollectionProps}
      />
    );

  return (
    <Paper
      elevation={0}
      className="lib-section"
      sx={{
        ...glassCard,
        '&:hover': {
          transform: 'none',
          boxShadow: paperRestingBoxShadow,
        },
        p: { xs: 2.5, md: 4 },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 3,
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Box>
          <Typography
            sx={{
              fontFamily: FONT_BODY,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: accent,
              mb: 0.5,
            }}
          >
            {t('profilePage.libraryLabel')}
          </Typography>
          <Typography
            sx={{
              fontFamily: FONT_DISPLAY,
              fontWeight: 700,
              fontSize: 20,
              color: titleColor,
              letterSpacing: -0.3,
            }}
          >
            {t('profilePage.libraryTitle')}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box
            sx={{
              px: 1.5,
              py: 0.5,
              borderRadius: 999,
              background: 'rgba(211,47,47,0.1)',
              border: '1px solid rgba(211,47,47,0.25)',
            }}
          >
            <Typography
              sx={{
                fontFamily: FONT_BODY,
                color: accent,
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {libraryBadgeText}
            </Typography>
          </Box>
          <IconButton
            aria-label={t('profilePage.libraryOptionsAria')}
            onClick={(e: React.MouseEvent<HTMLButtonElement>) =>
              setLibrarySectionMenuAnchor(e.currentTarget)
            }
            size="small"
            sx={{ color: '#2e7d32' }}
          >
            <MoreVertIcon />
          </IconButton>
          <Menu
            anchorEl={librarySectionMenuAnchor}
            open={Boolean(librarySectionMenuAnchor)}
            onClose={() => setLibrarySectionMenuAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            PaperProps={{
              sx: {
                borderRadius: '12px',
                minWidth: 200,
                fontFamily: FONT_BODY,
              },
            }}
          >
            <MenuItem
              onClick={() => {
                setLibrarySectionMenuAnchor(null);
                setCreateCollectionModalOpen(true);
              }}
              sx={{ fontFamily: FONT_BODY, fontSize: 14 }}
            >
              {t('profilePage.createCollection')}
            </MenuItem>
            <MenuItem
              onClick={() => {
                setLibrarySectionMenuAnchor(null);
                setManageCollectionsModalOpen(true);
              }}
              sx={{ fontFamily: FONT_BODY, fontSize: 14 }}
            >
              {t('profilePage.manageCollections')}
            </MenuItem>
          </Menu>
        </Box>
      </Box>
      {gamesLoading ? (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
          }}
        >
          <CircularProgress />
        </Box>
      ) : (
        <>
          <LibraryFilters
            value={libraryFilter}
            onChange={setLibraryFilter}
            counts={libraryCounts}
            collections={collections}
            collectionValue={collectionFilterId}
            onCollectionChange={setLibraryCollectionFilter}
            collectionsLoading={collectionsLoading}
          />
          <Box
            sx={{
              height: '1px',
              background: `linear-gradient(to right, ${accent}33, ${borderColor}, transparent)`,
              mb: 3,
            }}
          />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {libraryLists}
          </Box>
        </>
      )}
    </Paper>
  );
}
