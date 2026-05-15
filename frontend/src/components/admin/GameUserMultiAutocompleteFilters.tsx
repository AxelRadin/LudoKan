import { Box } from '@mui/material';
import type { AdminEntityPick } from '../../types/adminReviews';
import { gamePick, userPick } from '../../utils/adminMappers';
import AdminRemoteAutocomplete from './AdminRemoteAutocomplete';

type Props = Readonly<{
  gamesValue: AdminEntityPick[];
  onGamesChange: (next: AdminEntityPick[]) => void;
  usersValue: AdminEntityPick[];
  onUsersChange: (next: AdminEntityPick[]) => void;
}>;

export default function GameUserMultiAutocompleteFilters({
  gamesValue,
  onGamesChange,
  usersValue,
  onUsersChange,
}: Props) {
  return (
    <Box sx={{ display: 'contents' }}>
      <AdminRemoteAutocomplete
        multiple
        label="Jeux"
        placeholder="Tapez au moins 2 caractères"
        helperText="Recherche par nom ; plusieurs jeux possibles."
        value={gamesValue}
        onChange={onGamesChange}
        mapper={gamePick}
        searchUrl={debounced => {
          const p = new URLSearchParams();
          p.set('search', debounced);
          p.set('page_size', '25');
          return `/api/games/?${p.toString()}`;
        }}
      />
      <AdminRemoteAutocomplete
        multiple
        label="Utilisateurs"
        placeholder="Pseudo ou e-mail (2+ car.)"
        helperText="Plusieurs utilisateurs possibles."
        value={usersValue}
        onChange={onUsersChange}
        mapper={userPick}
        searchUrl={debounced => {
          const p = new URLSearchParams();
          p.set('search', debounced);
          p.set('page_size', '30');
          return `/api/admin/users/?${p.toString()}`;
        }}
      />
    </Box>
  );
}
