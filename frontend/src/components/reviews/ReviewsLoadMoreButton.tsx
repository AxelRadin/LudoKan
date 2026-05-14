import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import type { SxProps, Theme } from '@mui/material/styles';

export type ReviewsLoadMoreButtonProps = Readonly<{
  onClick: () => void;
  isLoadingMore: boolean;
  loadMoreError: string | null;
  sx?: SxProps<Theme>;
}>;

export default function ReviewsLoadMoreButton({
  onClick,
  isLoadingMore,
  loadMoreError,
  sx,
}: ReviewsLoadMoreButtonProps) {
  const { t } = useTranslation();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
        ...sx,
      }}
    >
      <Button
        variant="outlined"
        size="small"
        onClick={onClick}
        disabled={isLoadingMore}
        sx={{ textTransform: 'none' }}
      >
        {isLoadingMore ? (
          <>
            <CircularProgress size={16} sx={{ mr: 1 }} />
            {t('gamePageBody.reviewsLoadingMore')}
          </>
        ) : (
          t('gamePageBody.reviewsLoadMore')
        )}
      </Button>
      {loadMoreError ? (
        <Typography variant="caption" color="error">
          {loadMoreError}
        </Typography>
      ) : null}
    </Box>
  );
}
