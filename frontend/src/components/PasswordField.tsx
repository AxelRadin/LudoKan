import React, { useState } from 'react';
import {
  TextField,
  type TextFieldProps,
  IconButton,
  InputAdornment,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

/**
 * Un composant TextField spécialisé pour les mots de passe avec un bouton
 * permettant d'afficher/masquer le texte.
 */
export const PasswordField: React.FC<TextFieldProps> = props => {
  const [showPassword, setShowPassword] = useState(false);

  const handleClickShowPassword = () => setShowPassword(show => !show);

  const handleMouseDownPassword = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
  };

  return (
    <TextField
      {...props}
      type={showPassword ? 'text' : 'password'}
      InputProps={{
        ...props.InputProps,
        endAdornment: (
          <InputAdornment position="end">
            <IconButton
              aria-label="toggle password visibility"
              onClick={handleClickShowPassword}
              onMouseDown={handleMouseDownPassword}
              edge="end"
              sx={{
                width: 42,
                height: 42,
                color: showPassword ? 'primary.main' : 'text.secondary',
                transition: 'all 0.15s ease',
                '&:hover': {
                  backgroundColor: 'rgba(255, 61, 61, 0.08)',
                  color: 'primary.main',
                },
              }}
            >
              {showPassword ? (
                <VisibilityOff sx={{ fontSize: 22 }} />
              ) : (
                <Visibility sx={{ fontSize: 22 }} />
              )}
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );
};

export default PasswordField;
