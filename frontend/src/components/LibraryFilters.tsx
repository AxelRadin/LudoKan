import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
} from '@mui/material';
import type { UserCollection } from '../api/collections';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  LibraryCollectionFilter,
  LibraryCounts,
  LibraryStatusFilter,
} from '../constants/libraryFilter';

const STATUS_FILTERS: Exclude<LibraryStatusFilter, 'ALL'>[] = [
  'EN_COURS',
  'TERMINE',
  'ENVIE_DE_JOUER',
];

const FONT_BODY = "'DM Sans', system-ui, sans-serif";
const C = {
  title: '#0f0f0f',
  muted: '#6e6e73',
  border: '#f1c7c7',
  accent: '#d32f2f',
  accentDark: '#b71c1c',
  softBg: 'rgba(255,255,255,0.65)',
  activeBorder: 'rgba(211,47,47,0.45)',
};

function countFor(id: LibraryStatusFilter, counts: LibraryCounts): number {
  switch (id) {
    case 'ALL':
      return counts.all;
    case 'EN_COURS':
      return counts.enCours;
    case 'TERMINE':
      return counts.termines;
    case 'ENVIE_DE_JOUER':
      return counts.envie;
    default:
      return 0;
  }
}

type LibraryFiltersProps = {
  value: LibraryStatusFilter;
  onChange: (next: LibraryStatusFilter) => void;
  counts: LibraryCounts;
  collections?: UserCollection[];
  collectionValue: LibraryCollectionFilter;
  onCollectionChange: (next: LibraryCollectionFilter) => void;
  collectionsLoading?: boolean;
};

const FILTER_ORDER: LibraryStatusFilter[] = ['ALL', ...STATUS_FILTERS];

export default function LibraryFilters({
  value,
  onChange,
  counts,
  collections = [],
  collectionValue,
  onCollectionChange,
  collectionsLoading = false,
}: Readonly<LibraryFiltersProps>) {
  const { t } = useTranslation();
  const selectValue = collectionValue === 'ALL' ? '' : String(collectionValue);

  const filterLabels = useMemo(
    (): Record<LibraryStatusFilter, string> => ({
      ALL: t('libraryFilters.statusAll'),
      EN_COURS: t('profilePage.statusPlaying'),
      TERMINE: t('profilePage.statusDone'),
      ENVIE_DE_JOUER: t('profilePage.statusWishlist'),
    }),
    [t]
  );

  return (
    <Box sx={{ mb: 2 }}>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1,
          mb: 2,
          rowGap: 1.25,
        }}
        role="tablist"
        aria-label={t('libraryFilters.filterByStatusAria')}
      >
        <FormControl
          size="small"
          sx={{ minWidth: { xs: '100%', sm: 280 }, maxWidth: 400 }}
        >
          <InputLabel id="library-collection-filter-label">
            {t('libraryFilters.collection')}
          </InputLabel>
          <Select
            labelId="library-collection-filter-label"
            label={t('libraryFilters.collection')}
            value={selectValue}
            disabled={collectionsLoading}
            onChange={e => {
              const v = e.target.value;
              onCollectionChange(v === '' ? 'ALL' : Number(v));
            }}
            sx={{ fontFamily: FONT_BODY, borderRadius: '12px' }}
          >
            <MenuItem value="">
              <em>{t('libraryFilters.allCollections')}</em>
            </MenuItem>
            {collections.map(c => (
              <MenuItem key={c.id} value={String(c.id)}>
                {c.name} ({c.games_count})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {FILTER_ORDER.map(id => {
          const selected = value === id;
          const n = countFor(id, counts);
          return (
            <Button
              key={id}
              onClick={() => onChange(id)}
              disableElevation
              variant={selected ? 'contained' : 'outlined'}
              role="tab"
              aria-selected={selected}
              sx={{
                borderRadius: 999,
                textTransform: 'none',
                fontFamily: FONT_BODY,
                fontSize: 13,
                fontWeight: selected ? 700 : 600,
                minHeight: 36,
                px: 1.75,
                py: 0.75,
                borderColor: selected ? C.activeBorder : C.border,
                color: selected ? '#fff' : C.title,
                bgcolor: selected ? C.accent : C.softBg,
                boxShadow: 'none',
                '&:hover': {
                  boxShadow: 'none',
                  bgcolor: selected ? C.accentDark : 'rgba(255,255,255,0.9)',
                  borderColor: selected ? C.accentDark : C.accent,
                },
              }}
            >
              {filterLabels[id]}{' '}
              <Box
                component="span"
                sx={{
                  ml: 0.5,
                  fontWeight: 700,
                  opacity: selected ? 0.95 : 1,
                  color: selected ? 'rgba(255,255,255,0.92)' : C.muted,
                }}
              >
                ({n})
              </Box>
            </Button>
          );
        })}
      </Box>
    </Box>
  );
}
