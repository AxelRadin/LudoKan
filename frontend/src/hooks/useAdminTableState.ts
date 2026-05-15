import { useEffect, useState } from 'react';
import { useDebouncedValue } from './useDebouncedValue';

export interface SnackbarState {
  message: string;
  severity: 'success' | 'error';
}

export function useAdminTableState<T>(initialFilters: T, debounceMs = 350) {
  const [draftFilters, setDraftFilters] = useState<T>(initialFilters);
  const filters = useDebouncedValue(draftFilters, debounceMs);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const [snackbar, setSnackbar] = useState<SnackbarState | null>(null);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [filters]);

  const resetFilters = () => {
    setDraftFilters(initialFilters);
    // Explicitly reset page as well, though the effect above will also trigger
    setPage(0);
  };

  return {
    // Filter state
    filters,
    draftFilters,
    setDraftFilters,
    resetFilters,

    // Pagination state
    page,
    setPage,
    pageSize,
    setPageSize,

    // Snackbar state
    snackbar,
    setSnackbar,
  };
}
