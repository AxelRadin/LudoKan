import React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box sx={{ width: 320, mt: 4 }}>
      <Typography
        variant="body2"
        sx={{
          textAlign: 'center',
          mb: 2,
          color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
          fontWeight: 500,
        }}
      >
        {title}
      </Typography>

      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
        {/* Google */}
        <Button
          type="button"
          data-testid="social-btn-google"
          aria-label={t('socialLogin.google')}
          onClick={onGoogleClick}
          sx={{
            minWidth: 56,
            height: 56,
            borderRadius: 3,
            border: isDark
              ? '1px solid rgba(255,255,255,0.12)'
              : '1px solid #dadce0',
            bgcolor: isDark ? 'rgba(255,255,255,0.05)' : '#ffffff',
            transition: 'all 0.2s ease',
            '&:hover': {
              bgcolor: isDark ? 'rgba(255,255,255,0.1)' : '#f8f9fa',
              transform: 'translateY(-4px)',
              boxShadow: '0 8px 16px rgba(66,133,244,0.3)',
            },
          }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 18 18"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g fill="none" fillRule="evenodd">
              <path
                d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
                fill="#4285F4"
              />
              <path
                d="M9.003 18c2.43 0 4.467-.806 5.956-2.18L12.05 13.56c-.806.54-1.836.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.96v2.332C2.438 15.983 5.482 18 9.003 18z"
                fill="#34A853"
              />
              <path
                d="M3.964 10.712c-.18-.54-.282-1.117-.282-1.71 0-.593.102-1.17.282-1.71V4.96H.957C.347 6.175 0 7.55 0 9.002c0 1.452.348 2.827.957 4.042l3.007-2.332z"
                fill="#FBBC05"
              />
              <path
                d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.426 0 9.002 0 5.48 0 2.438 2.017.96 4.958L3.967 7.29c.708-2.127 2.692-3.71 5.036-3.71z"
                fill="#EA4335"
              />
            </g>
          </svg>
        </Button>

        {/* Steam */}
        <Button
          type="button"
          data-testid="social-btn-steam"
          aria-label={t('socialLogin.steam')}
          onClick={onSteamClick}
          sx={{
            minWidth: 56,
            height: 56,
            borderRadius: 3,
            bgcolor: '#171a21',
            transition: 'all 0.2s ease',
            '&:hover': {
              bgcolor: '#1b2838',
              transform: 'translateY(-4px)',
              boxShadow: '0 8px 16px rgba(23,26,33,0.5)',
            },
          }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 256 259"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M127.779 0C70.579 0 22.593 42.099 11.638 96.403l62.135 25.713a36.37 36.37 0 0 1 20.726-6.488c.848 0 1.688.028 2.515.08l27.649-40.045v-.562c0-27.086 21.991-49.021 49.021-49.021 27.085 0 49.021 21.935 49.021 49.021 0 27.029-21.936 49.021-49.021 49.021h-1.124l-39.482 28.245c.056.791.084 1.6.084 2.403a36.422 36.422 0 0 1-36.421 36.422c-18.003 0-33.286-13.035-36.141-30.218L18.003 140.92C28.958 199.141 73.159 244.373 127.78 256L256 0H127.78z"
              fill="#ffffff"
            />
            <path
              d="M82.086 173.24l-14.411-5.966a27.046 27.046 0 0 0 13.313 23.538c13.202 6.937 29.387 1.686 36.352-11.544a27.118 27.118 0 0 0-11.488-36.437 27.053 27.053 0 0 0-20.947-1.124l14.889 6.149a19.932 19.932 0 0 1 10.617 26.125 19.931 19.931 0 0 1-26.125 10.616c-2.492-1.04-4.648-2.659-6.32-4.657z"
              fill="#ffffff"
            />
            <path
              d="M204.918 75.429c0-18.059-14.627-32.686-32.686-32.686-18.003 0-32.63 14.627-32.63 32.686 0 18.003 14.627 32.63 32.63 32.63 18.059 0 32.686-14.627 32.686-32.63zm-57.097 0c0-13.539 10.927-24.522 24.467-24.522 13.539 0 24.466 10.983 24.466 24.522s-10.927 24.522-24.466 24.522c-13.54 0-24.467-10.983-24.467-24.522z"
              fill="#ffffff"
            />
          </svg>
        </Button>

        {/* Apple */}
        <Button
          disabled
          aria-label={t('socialLogin.apple')}
          sx={{
            minWidth: 56,
            height: 56,
            borderRadius: 3,
            bgcolor: isDark ? '#ffffff' : '#000000',
            opacity: 0.5,
            cursor: 'not-allowed',
            transition: 'all 0.2s ease',
            '&:hover': {
              bgcolor: isDark ? '#ffffff' : '#000000',
            },
          }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
              fill={isDark ? '#000000' : '#ffffff'}
            />
          </svg>
        </Button>

        {/* X (Twitter) */}
        <Button
          disabled
          aria-label={t('socialLogin.x')}
          sx={{
            minWidth: 56,
            height: 56,
            borderRadius: 3,
            bgcolor: '#000000',
            opacity: 0.5,
            cursor: 'not-allowed',
            transition: 'all 0.2s ease',
            '&:hover': {
              bgcolor: '#000000',
            },
          }}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
              fill="#ffffff"
            />
          </svg>
        </Button>
      </Box>
    </Box>
  );
};

export default SocialLoginSection;
