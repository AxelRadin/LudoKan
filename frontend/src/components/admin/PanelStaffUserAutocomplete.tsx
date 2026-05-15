import { Autocomplete, CircularProgress, TextField } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { apiGet } from '../../services/api';
import type { AdminEntityPick } from '../../types/adminReviews';

type UnknownRecord = Record<string, unknown>;

function isRecord(x: unknown): x is UnknownRecord {
  return typeof x === 'object' && x !== null;
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

const MIN_SEARCH = 2;

type Props = Readonly<{
  value: AdminEntityPick | null;
  onChange: (next: AdminEntityPick | null) => void;
}>;

export default function PanelStaffUserAutocomplete({ value, onChange }: Props) {
  const [input, setInput] = useState('');
  const debounced = useDebouncedValue(input, 300);

  const url = useMemo(() => {
    if (debounced.length < MIN_SEARCH) return null;
    const p = new URLSearchParams();
    p.set('search', debounced);
    p.set('panel_staff_only', '1');
    p.set('page_size', '30');
    return `/api/admin/users/?${p.toString()}`;
  }, [debounced]);

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
          const p = userPick(row);
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
  }, [url]);

  return (
    <Autocomplete
      options={options}
      value={value}
      onChange={(_, v) => onChange(v)}
      getOptionLabel={o => o.label}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      filterOptions={x => x}
      inputValue={input}
      onInputChange={(_, v, reason) => {
        if (reason === 'reset') return;
        setInput(v);
      }}
      loading={loading}
      renderInput={params => (
        <TextField
          {...params}
          label="Acteur (modérateur / admin)"
          size="small"
          placeholder="Pseudo ou e-mail (2+ car.)"
          helperText="Uniquement les comptes avec un rôle panel."
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? (
                  <CircularProgress color="inherit" size={16} />
                ) : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}
