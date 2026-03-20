import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import { CircularProgress } from '@mui/material';
import type { ReactNode } from 'react';
import type { SxProps, Theme } from '@mui/material/styles';

type RenderAddToLibraryIconParams = {
  adding: boolean;
  added: boolean;
  iconSize?: number;
  loaderSize?: number;
  iconSx?: SxProps<Theme>;
  loaderSx?: SxProps<Theme>;
};

export function renderAddToLibraryIcon({
  adding,
  added,
  iconSize = 16,
  loaderSize = 16,
  iconSx,
  loaderSx,
}: RenderAddToLibraryIconParams): ReactNode {
  if (adding) {
    return <CircularProgress size={loaderSize} sx={loaderSx} />;
  }

  if (added) {
    return <CheckIcon sx={{ fontSize: iconSize, ...iconSx }} />;
  }

  return <AddIcon sx={{ fontSize: iconSize, ...iconSx }} />;
}
