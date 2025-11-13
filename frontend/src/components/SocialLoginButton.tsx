import AppleIcon from '@mui/icons-material/Apple';
import GoogleIcon from '@mui/icons-material/Google';
import InstagramIcon from '@mui/icons-material/Instagram';
import XIcon from '@mui/icons-material/X';
import IconButton from '@mui/material/IconButton';
import React, { type JSX } from 'react';

interface Props {
  icon: 'google' | 'apple' | 'x' | 'instagram';
}

const iconMap: Record<Props['icon'], JSX.Element> = {
  google: <GoogleIcon fontSize="large" />,
  apple: <AppleIcon fontSize="large" />,
  x: <XIcon fontSize="large" />,
  instagram: <InstagramIcon fontSize="large" />,
};

export const SocialLoginButton: React.FC<Props> = ({ icon }) => (
  <IconButton>{iconMap[icon]}</IconButton>
);

export default SocialLoginButton;