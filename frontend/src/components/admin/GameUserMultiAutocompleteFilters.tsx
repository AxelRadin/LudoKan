import { Autocomplete, Box, CircularProgress, TextField } from '@mui/material';
import { useMemo, useState } from 'react';
import type { AdminEntityPick } from '../../types/adminReviews';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useRemotePicks } from '../../hooks/useRemotePicks';
import { gamePick, userPick } from '../../utils/adminMappers';

type Props = Readonly<{
  gamesValue: AdminEntityPick[];
  onGamesChange: (next: AdminEntityPick[]) => void;
  usersValue: AdminEntityPick[];
  onUsersChange: (next: AdminEntityPick[]) => void;
}>;

const MIN_SEARCH = 2;

export default function GameUserMultiAutocompleteFilters({
  gamesValue,
  onGamesChange,
  usersValue,
  onUsersChange,
}: Props) {
  const [gameInput, setGameInput] = useState('');
  const [userInput, setUserInput] = useState('');

  const gameDebounced = useDebouncedValue(gameInput, 300);
  const userDebounced = useDebouncedValue(userInput, 300);

  const gamesUrl = useMemo(() => {
    if (gameDebounced.length < MIN_SEARCH) return null;
    const p = new URLSearchParams();
    p.set('search', gameDebounced);
    p.set('page_size', '25');
    return `/api/games/?${p.toString()}`;
  }, [gameDebounced]);

  const usersUrl = useMemo(() => {
    if (userDebounced.length < MIN_SEARCH) return null;
    const p = new URLSearchParams();
    p.set('search', userDebounced);
    p.set('page_size', '30');
    return `/api/admin/users/?${p.toString()}`;
  }, [userDebounced]);

  const { options: gameOptions, loading: gameLoading } = useRemotePicks(
    gamesUrl,
    gamePick
  );
  const { options: userOptions, loading: userLoading } = useRemotePicks(
    usersUrl,
    userPick
  );

  return (
    <Box sx={{ display: 'contents' }}>
      <Autocomplete
        multiple
        options={gameOptions}
        value={gamesValue}
        onChange={(_, v) => onGamesChange(v)}
        getOptionLabel={o => o.label}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        filterOptions={x => x}
        inputValue={gameInput}
        onInputChange={(_, v, reason) => {
          if (reason === 'reset') return;
          setGameInput(v);
        }}
        loading={gameLoading}
        renderInput={params => (
          <TextField
            {...params}
            label="Jeux"
            size="small"
            placeholder="Tapez au moins 2 caractères"
            helperText="Recherche par nom ; plusieurs jeux possibles."
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {gameLoading ? (
                    <CircularProgress color="inherit" size={16} />
                  ) : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
      />
      <Autocomplete
        multiple
        options={userOptions}
        value={usersValue}
        onChange={(_, v) => onUsersChange(v)}
        getOptionLabel={o => o.label}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        filterOptions={x => x}
        inputValue={userInput}
        onInputChange={(_, v, reason) => {
          if (reason === 'reset') return;
          setUserInput(v);
        }}
        loading={userLoading}
        renderInput={params => (
          <TextField
            {...params}
            label="Utilisateurs"
            size="small"
            placeholder="Pseudo ou e-mail (2+ car.)"
            helperText="Plusieurs utilisateurs possibles."
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {userLoading ? (
                    <CircularProgress color="inherit" size={16} />
                  ) : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
      />
    </Box>
  );
}
