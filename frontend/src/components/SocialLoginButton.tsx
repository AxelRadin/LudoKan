import { FaApple, FaFacebook, FaGoogle } from 'react-icons/fa';
import IconButton from '@mui/material/IconButton';
import React, { type JSX } from 'react';

interface Props {
  icon: 'google' | 'apple' | 'facebook';
  onClick?: () => void;
}

const iconMap: Record<Props['icon'], JSX.Element> = {
  google: <FaGoogle size={24} />,
  apple: <FaApple size={24} />,
  facebook: <FaFacebook size={24} />,
};

export const SocialLoginButton: React.FC<Props> = ({ icon, onClick }) => (
  <IconButton onClick={onClick} aria-label={`Se connecter avec ${icon}`}>
    {iconMap[icon]}
  </IconButton>
);

export default SocialLoginButton;
