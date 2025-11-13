import Button, { type ButtonProps } from '@mui/material/Button';
import React from 'react';

const SecondaryButton: React.FC<ButtonProps> = props => (
  <Button
    variant="outlined"
    {...props}
    sx={{
      borderColor: 'black',
      color: 'black',
      '&:hover': { backgroundColor: 'black', color: 'white' },
      ...props.sx,
    }}
  />
);

export default SecondaryButton;