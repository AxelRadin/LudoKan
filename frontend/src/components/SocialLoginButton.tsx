import { FaApple, FaGoogle, FaInstagram, FaTwitter } from 'react-icons/fa';
import IconButton from '@mui/material/IconButton';
import React, { type JSX } from 'react';

interface Props {
  icon: 'google' | 'apple' | 'x' | 'instagram';
}

const iconMap: Record<Props['icon'], JSX.Element> = {
  google: <FaGoogle size={24} />,
  apple: <FaApple size={24} />,
  x: <FaTwitter size={24} />,
  instagram: <FaInstagram size={24} />,
};

export const SocialLoginButton: React.FC<Props> = ({ icon }) => (
  <IconButton>{iconMap[icon]}</IconButton>
);

export default SocialLoginButton;