import { Autocomplete, CircularProgress, TextField } from '@mui/material';
import { useMemo, useState } from 'react';
import type { AdminEntityPick } from '../../types/adminReviews';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useRemotePicks } from '../../hooks/useRemotePicks';
import { userPick } from '../../utils/adminMappers';

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

  const { options, loading } = useRemotePicks(url, userPick);

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
