import React from 'react';
import { Box, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { useTranslation } from 'react-i18next';

type Rule = {
  key: string;
  test: (pw: string) => boolean;
};

const RULES: Rule[] = [
  { key: 'minLength', test: pw => pw.length >= 8 },
  { key: 'hasDigit', test: pw => /\d/.test(pw) },
  { key: 'hasSpecial', test: pw => /[^a-zA-Z0-9]/.test(pw) },
  { key: 'hasUppercase', test: pw => /[A-Z]/.test(pw) },
];

function getStrength(password: string): number {
  if (!password) return 0;
  return RULES.filter(r => r.test(password)).length;
}

const STRENGTH_BAR_SEGMENTS = [
  { id: 'strength-bar-weak', color: '#f44336' },
  { id: 'strength-bar-fair', color: '#ff9800' },
  { id: 'strength-bar-good', color: '#ffc107' },
  { id: 'strength-bar-strong', color: '#4caf50' },
] as const;

type PasswordStrengthIndicatorProps = {
  password: string;
};

const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password,
}) => {
  const { t } = useTranslation();

  if (!password) return null;

  const strength = getStrength(password);
  const strengthLabels = [
    t('passwordStrength.weak'),
    t('passwordStrength.fair'),
    t('passwordStrength.good'),
    t('passwordStrength.strong'),
  ];

  const ruleLabels: Record<string, string> = {
    minLength: t('passwordStrength.ruleMinLength'),
    hasDigit: t('passwordStrength.ruleHasDigit'),
    hasSpecial: t('passwordStrength.ruleHasSpecial'),
    hasUppercase: t('passwordStrength.ruleHasUppercase'),
  };

  const strengthIdx = Math.min(Math.max(strength - 1, 0), 3);
  const activeColor = STRENGTH_BAR_SEGMENTS[strengthIdx].color;

  return (
    <Box sx={{ mt: -0.5, mb: 0.5 }}>
      {/* Strength bar */}
      <Box sx={{ display: 'flex', gap: 0.5, mb: 0.75 }}>
        {STRENGTH_BAR_SEGMENTS.map((segment, i) => (
          <Box
            key={segment.id}
            sx={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              bgcolor: i < strength ? activeColor : 'action.disabledBackground',
              transition: 'background-color 0.2s ease',
            }}
          />
        ))}
      </Box>

      {/* Strength label */}
      <Typography
        variant="caption"
        sx={{
          color: activeColor,
          fontWeight: 600,
          fontSize: 11.5,
          mb: 0.5,
          display: 'block',
        }}
      >
        {strengthLabels[strengthIdx]}
      </Typography>

      {/* Rules checklist */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
        {RULES.map(rule => {
          const passed = rule.test(password);
          return (
            <Box
              key={rule.key}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
              }}
            >
              {passed ? (
                <CheckCircleIcon sx={{ fontSize: 14, color: '#4caf50' }} />
              ) : (
                <RadioButtonUncheckedIcon
                  sx={{ fontSize: 14, color: 'text.disabled' }}
                />
              )}
              <Typography
                variant="caption"
                sx={{
                  color: passed ? 'text.secondary' : 'text.disabled',
                  fontSize: 12,
                  lineHeight: 1.6,
                  textDecoration: passed ? 'none' : 'none',
                }}
              >
                {ruleLabels[rule.key]}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default PasswordStrengthIndicator;
