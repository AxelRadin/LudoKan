import Button, { type ButtonProps } from '@mui/material/Button';
import React from 'react';

const SecondaryButton: React.FC<ButtonProps> = props => (
  <Button
    variant="outlined"
    {...props}
    sx={{
      borderRadius: '12px',
      borderColor: 'black',
      color: 'black',
      '&:hover': { backgroundColor: 'black', color: 'white' },
      '& .MuiTouchRipple-ripple .MuiTouchRipple-child': {
        borderRadius: '12px',
        backgroundColor: 'rgba(255, 61, 61, 0.3)',
      },
      ...props.sx,
    }}
  />
);

export default SecondaryButton;
