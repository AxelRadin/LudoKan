import { Autocomplete, CircularProgress, TextField } from '@mui/material';
import { useMemo, useState } from 'react';
import type { AdminEntityPick } from '../../types/adminReviews';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useRemotePicks } from '../../hooks/useRemotePicks';

const MIN_SEARCH = 2;

interface BaseProps {
  label: string;
  placeholder?: string;
  helperText?: string;
  searchUrl: (debounced: string) => string | null;
  mapper: (raw: any) => AdminEntityPick | null;
  size?: 'small' | 'medium';
}

interface SingleProps extends BaseProps {
  multiple?: false;
  value: AdminEntityPick | null;
  onChange: (next: AdminEntityPick | null) => void;
}

interface MultiProps extends BaseProps {
  multiple: true;
  value: AdminEntityPick[];
  onChange: (next: AdminEntityPick[]) => void;
}

type Props = SingleProps | MultiProps;

/**
 * Generic remote autocomplete for admin panels to reduce duplication.
 */
export default function AdminRemoteAutocomplete(props: Props) {
  const {
    label,
    placeholder,
    helperText,
    searchUrl,
    mapper,
    size = 'small',
  } = props;

  const [input, setInput] = useState('');
  const debounced = useDebouncedValue(input, 300);

  const url = useMemo(() => {
    if (debounced.length < MIN_SEARCH) return null;
    return searchUrl(debounced);
  }, [debounced, searchUrl]);

  const { options, loading } = useRemotePicks(url, mapper);

  const commonProps = {
    options,
    getOptionLabel: (o: AdminEntityPick) => o.label,
    isOptionEqualToValue: (a: AdminEntityPick, b: AdminEntityPick) =>
      a.id === b.id,
    filterOptions: (x: any) => x,
    inputValue: input,
    onInputChange: (_: any, v: string, reason: string) => {
      if (reason === 'reset') return;
      setInput(v);
    },
    loading,
    renderInput: (params: any) => (
      <TextField
        {...params}
        label={label}
        size={size}
        placeholder={placeholder}
        helperText={helperText}
        InputProps={{
          ...params.InputProps,
          endAdornment: (
            <>
              {loading ? <CircularProgress color="inherit" size={16} /> : null}
              {params.InputProps.endAdornment}
            </>
          ),
        }}
      />
    ),
  };

  if (props.multiple) {
    return (
      <Autocomplete
        {...commonProps}
        multiple
        value={props.value}
        onChange={(_, v) => props.onChange(v)}
      />
    );
  }

  return (
    <Autocomplete
      {...commonProps}
      multiple={false}
      value={props.value}
      onChange={(_, v) => props.onChange(v)}
    />
  );
}
