import { FaApple, FaGoogle, FaInstagram, FaTwitter } from 'react-icons/fa';
import IconButton from '@mui/material/IconButton';
import React, { type JSX } from 'react';
import { useTranslation } from 'react-i18next';

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

export const SocialLoginButton: React.FC<Props> = ({
  icon,
  onClick,
  disabled,
  'aria-label': ariaLabel,
}) => {
  const { t } = useTranslation();

  const defaultLabels: Record<Props['icon'], string> = {
    google: t('socialLogin.google'),
    apple: t('socialLogin.apple'),
    x: t('socialLogin.x'),
    instagram: t('socialLogin.instagram'),
  };

  return (
    <IconButton
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel ?? defaultLabels[icon]}
    >
      {iconMap[icon]}
    </IconButton>
  );
};

export default SocialLoginButton;
