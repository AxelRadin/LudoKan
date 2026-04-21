import { FaApple, FaGoogle, FaInstagram, FaTwitter } from 'react-icons/fa';
import IconButton from '@mui/material/IconButton';
import React, { type JSX } from 'react';

interface Props {
  icon: 'google' | 'apple' | 'x' | 'instagram';
  onClick?: () => void;
  disabled?: boolean;
  'aria-label'?: string;
}

const iconMap: Record<Props['icon'], JSX.Element> = {
  google: <FaGoogle size={24} />,
  apple: <FaApple size={24} />,
  x: <FaTwitter size={24} />,
  instagram: <FaInstagram size={24} />,
};

const defaultLabels: Record<Props['icon'], string> = {
  google: 'Se connecter avec Google',
  apple: 'Se connecter avec Apple',
  x: 'Se connecter avec X',
  instagram: 'Se connecter avec Instagram',
};

export const SocialLoginButton: React.FC<Props> = ({
  icon,
  onClick,
  disabled,
  'aria-label': ariaLabel,
}) => (
  <IconButton
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={ariaLabel ?? defaultLabels[icon]}
  >
    {iconMap[icon]}
  </IconButton>
);

export default SocialLoginButton;
