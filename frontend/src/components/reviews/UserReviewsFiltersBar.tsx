import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  TextField,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import {
  DEFAULT_USER_REVIEWS_FILTERS,
  type UserReviewsListFilters,
  type UserReviewsRatingFilter,
} from '../../constants/userReviewsFilters';

const FONT_BODY = "'DM Sans', system-ui, sans-serif";

type UserReviewsFiltersBarProps = Readonly<{
  filters: UserReviewsListFilters;
  onPatch: (patch: Partial<UserReviewsListFilters>) => void;
  disabled?: boolean;
}>;

function ratingSelectValue(f: UserReviewsListFilters): string {
  if (f.ratingFilter === 'all') return '';
  if (f.ratingFilter === 'none') return 'none';
  return String(f.ratingFilter);
}

export default function UserReviewsFiltersBar({
  filters,
  onPatch,
  disabled = false,
}: UserReviewsFiltersBarProps) {
  const { t } = useTranslation();

  const reset =
    JSON.stringify(filters) !== JSON.stringify(DEFAULT_USER_REVIEWS_FILTERS);

  const handleRatingChange = (e: SelectChangeEvent) => {
    const v = e.target.value;
    const ratingFilter: UserReviewsRatingFilter =
      v === ''
        ? 'all'
        : v === 'none'
          ? 'none'
          : (Number(v) as 1 | 2 | 3 | 4 | 5);

    onPatch({ ratingFilter });
  };

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      flexWrap="wrap"
      useFlexGap
      sx={{ mb: 3, alignItems: { sm: 'center' } }}
    >
      <FormControl
        size="small"
        sx={{ minWidth: 180, flex: { sm: '0 0 auto' } }}
      >
        <InputLabel id="ur-filter-rating-label">
          {t('userReviewsPage.filterRating')}
        </InputLabel>
        <Select
          labelId="ur-filter-rating-label"
          label={t('userReviewsPage.filterRating')}
          value={ratingSelectValue(filters)}
          disabled={disabled}
          onChange={handleRatingChange}
          sx={{ fontFamily: FONT_BODY, borderRadius: '12px' }}
        >
          <MenuItem value="">
            <em>{t('userReviewsPage.allRatings')}</em>
          </MenuItem>
          {[1, 2, 3, 4, 5].map(n => (
            <MenuItem key={n} value={String(n)}>
              {t('userReviewsPage.starsOption', { n })}
            </MenuItem>
          ))}
          <MenuItem value="none">
            {t('userReviewsPage.noRatingOption')}
          </MenuItem>
        </Select>
      </FormControl>

      <FormControl
        size="small"
        sx={{ minWidth: 200, flex: { sm: '1 1 200px' } }}
      >
        <InputLabel id="ur-filter-order-label">
          {t('userReviewsPage.filterSort')}
        </InputLabel>
        <Select
          labelId="ur-filter-order-label"
          label={t('userReviewsPage.filterSort')}
          value={filters.ordering}
          disabled={disabled}
          onChange={e =>
            onPatch({
              ordering: e.target.value as UserReviewsListFilters['ordering'],
            })
          }
          sx={{ fontFamily: FONT_BODY, borderRadius: '12px' }}
        >
          <MenuItem value="recent">{t('userReviewsPage.sortRecent')}</MenuItem>
          <MenuItem value="oldest">{t('userReviewsPage.sortOldest')}</MenuItem>
          <MenuItem value="recent_edit">
            {t('userReviewsPage.sortRecentEdit')}
          </MenuItem>
        </Select>
      </FormControl>

      <TextField
        size="small"
        label={t('userReviewsPage.searchGameLabel')}
        placeholder={t('userReviewsPage.searchGamePlaceholder')}
        value={filters.search}
        disabled={disabled}
        onChange={e => onPatch({ search: e.target.value })}
        sx={{
          flex: { sm: '1 1 220px' },
          minWidth: { xs: '100%', sm: 200 },
          '& .MuiInputBase-root': {
            borderRadius: '12px',
            fontFamily: FONT_BODY,
          },
        }}
      />

      {reset ? (
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Button
            variant="text"
            size="small"
            disabled={disabled}
            onClick={() => onPatch({ ...DEFAULT_USER_REVIEWS_FILTERS })}
            sx={{ textTransform: 'none', fontFamily: FONT_BODY }}
          >
            {t('userReviewsPage.resetFilters')}
          </Button>
        </Box>
      ) : null}
    </Stack>
  );
}
