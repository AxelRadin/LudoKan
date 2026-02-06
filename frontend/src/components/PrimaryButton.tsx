import Button, { type ButtonProps } from '@mui/material/Button';
import React from 'react';

const PrimaryButton: React.FC<ButtonProps> = props => (
  <Button
    variant="contained"
    {...props}
    sx={{
      backgroundColor: 'red',
      color: 'white',
      borderRadius: 2,
      textTransform: 'none',
      px: 4,
      py: 1,
      fontWeight: 'bold',
      '&:hover': { backgroundColor: '#d40000' },
      ...props.sx,
    }}
  />
);

export default PrimaryButton;
