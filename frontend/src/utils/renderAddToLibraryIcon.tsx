import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import { CircularProgress } from '@mui/material';
import type { ReactNode } from 'react';

export function renderAddToLibraryIcon(
  adding: boolean,
  added: boolean
): ReactNode {
  if (adding) {
    return <CircularProgress size={14} sx={{ color: '#fff' }} />;
  }
  if (added) {
    return <CheckIcon sx={{ fontSize: 16 }} />;
  }
  return <AddIcon sx={{ fontSize: 16 }} />;
}
