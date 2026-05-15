import { Autocomplete, Box, CircularProgress, TextField } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { apiGet } from '../../services/api';
import type { AdminEntityPick } from '../../types/adminReviews';

type UnknownRecord = Record<string, unknown>;

function isRecord(x: unknown): x is UnknownRecord {
  return typeof x === 'object' && x !== null;
}

function gamePick(row: unknown): AdminEntityPick | null {
  if (!isRecord(row)) return null;
  const id = row.id;
  if (typeof id !== 'number') return null;
  const name = row.name;
  const label = typeof name === 'string' && name.trim() ? name : `#${id}`;
  return { id, label };
}

function userPick(row: unknown): AdminEntityPick | null {
  if (!isRecord(row)) return null;
  const id = row.id;
  if (typeof id !== 'number') return null;
  const pseudo = row.pseudo;
  const email = row.email;
  let label = '';
  if (typeof pseudo === 'string' && pseudo.trim()) label = pseudo;
  if (typeof email === 'string' && email.trim()) {
    label = label ? `${label} (${email})` : email;
  }
  if (!label) label = `#${id}`;
  return { id, label };
}

function useDebouncedValue(raw: string, ms: number) {
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(raw.trim()), ms);
    return () => clearTimeout(t);
  }, [raw, ms]);

  return debounced;
}

function useRemotePicks(
  url: string | null,
  mapRow: (row: unknown) => AdminEntityPick | null
) {
  const [options, setOptions] = useState<AdminEntityPick[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!url) {
      setOptions([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const data = await apiGet(url);
        const list = Array.isArray(data)
          ? data
          : (((data as UnknownRecord).results as unknown[] | undefined) ?? []);
        const picks: AdminEntityPick[] = [];
        for (const row of list) {
          const p = mapRow(row);
          if (p) picks.push(p);
        }
        if (!cancelled) setOptions(picks);
      } catch {
        if (!cancelled) setOptions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [url, mapRow]);

  return { options, loading };
}

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
