import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';

const F = "'Outfit', sans-serif";

type SectionAccentTitleProps = Readonly<{
  label: string;
  /** MUI spacing unit for `mb` (default 2 matches game page section labels). */
  marginBottom?: number;
}>;

export function SectionAccentTitle({
  label,
  marginBottom = 2,
}: SectionAccentTitleProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const accent = isDark ? '#ef5350' : '#d43c3c';

  return (
    <Box sx={{ position: 'relative', pl: '14px', mb: marginBottom }}>
      <Box
        sx={{
          position: 'absolute',
          left: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          width: '3px',
          height: '80%',
          background: `linear-gradient(to bottom, transparent, ${accent}, transparent)`,
          borderRadius: '2px',
          opacity: 0.8,
        }}
      />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{ width: 14, height: '1px', background: accent, opacity: 0.6 }}
        />
        <Typography
          sx={{
            fontFamily: F,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 3,
            textTransform: 'uppercase',
            color: accent,
            opacity: 0.9,
          }}
        >
          {label}
        </Typography>
      </Box>
    </Box>
  );
}
