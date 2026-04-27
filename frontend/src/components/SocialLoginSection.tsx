import React from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import SocialLoginButton from './SocialLoginButton';

type SocialLoginSectionProps = {
  title: string;
  onGoogleClick: () => void;
  onSteamClick: () => void;
};

const SocialLoginSection: React.FC<SocialLoginSectionProps> = ({
  title,
  onGoogleClick,
  onSteamClick,
}) => {
  return (
    <>
      <Typography variant="body1" mt={5}>
        {title}
      </Typography>

      <Stack direction="row" spacing={3} mt={1.5}>
        <SocialLoginButton icon="google" onClick={onGoogleClick} />
        <SocialLoginButton icon="steam" onClick={onSteamClick} />
        <SocialLoginButton icon="apple" />
        <SocialLoginButton icon="x" />
      </Stack>
    </>
  );
};

export default SocialLoginSection;
