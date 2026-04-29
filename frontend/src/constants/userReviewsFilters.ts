/** Tri côté API (`ordering`). */
export type UserReviewsOrdering = 'recent' | 'oldest' | 'recent_edit';

/** Filtre note : toutes, sans note liée, ou nombre d’étoiles 1–5. */
export type UserReviewsRatingFilter = 'all' | 'none' | 1 | 2 | 3 | 4 | 5;

export type UserReviewsListFilters = {
  ratingFilter: UserReviewsRatingFilter;
  /** Filtre nom du jeu (recherche partielle, debouncée dans le hook) */
  search: string;
  ordering: UserReviewsOrdering;
};

export const DEFAULT_USER_REVIEWS_FILTERS: UserReviewsListFilters = {
  ratingFilter: 'all',
  search: '',
  ordering: 'recent',
};

function orderingToApiParam(ordering: UserReviewsOrdering): string {
  switch (ordering) {
    case 'oldest':
      return 'date_created';
    case 'recent_edit':
      return '-date_modified';
    default:
      return '-date_created';
  }
}

/** URL relative première page (paramètres DRF). */
export function buildUserReviewsListUrl(
  userId: number,
  filters: UserReviewsListFilters
): string {
  const params = new URLSearchParams();
  params.set('user', String(userId));
  if (filters.ratingFilter === 'none') {
    params.set('has_rating', 'false');
  } else if (filters.ratingFilter !== 'all') {
    params.set('rating_value', String(filters.ratingFilter));
  }
  const q = filters.search.trim();
  if (q) {
    params.set('search', q);
  }
  params.set('ordering', orderingToApiParam(filters.ordering));
  return `/api/reviews/?${params.toString()}`;
}

export function userReviewsFiltersActive(
  filters: UserReviewsListFilters
): boolean {
  return filters.ratingFilter !== 'all' || filters.search.trim() !== '';
}
