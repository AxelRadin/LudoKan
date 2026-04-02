import { Chip, Box, Typography } from '@mui/material';

interface PlatformStyle {
  label: string;
  bg: string;
  color: string;
}

const PLATFORM_MAP: Record<string, PlatformStyle> = {
  // PlayStation
  'PlayStation':           { label: 'PS1',        bg: '#003087', color: '#fff' },
  'PlayStation 2':         { label: 'PS2',         bg: '#003087', color: '#fff' },
  'PlayStation 3':         { label: 'PS3',         bg: '#003087', color: '#fff' },
  'PlayStation 4':         { label: 'PS4',         bg: '#003791', color: '#fff' },
  'PlayStation 5':         { label: 'PS5',         bg: '#00439C', color: '#fff' },
  'PlayStation Portable':  { label: 'PSP',         bg: '#003087', color: '#fff' },
  'PlayStation Vita':      { label: 'PS Vita',     bg: '#003087', color: '#fff' },
  // Xbox
  'Xbox':                  { label: 'Xbox',        bg: '#107C10', color: '#fff' },
  'Xbox 360':              { label: 'Xbox 360',    bg: '#107C10', color: '#fff' },
  'Xbox One':              { label: 'Xbox One',    bg: '#107C10', color: '#fff' },
  'Xbox Series X|S':       { label: 'Series X|S', bg: '#107C10', color: '#fff' },
  'Xbox Series X':         { label: 'Series X',   bg: '#107C10', color: '#fff' },
  // Nintendo
  'Nintendo Switch':       { label: 'Switch',      bg: '#E4000F', color: '#fff' },
  'Nintendo Switch 2':     { label: 'Switch 2',    bg: '#E4000F', color: '#fff' },
  'Nintendo 3DS':          { label: '3DS',          bg: '#CC0000', color: '#fff' },
  'New Nintendo 3DS':      { label: 'New 3DS',     bg: '#CC0000', color: '#fff' },
  'Wii':                   { label: 'Wii',          bg: '#009AC7', color: '#fff' },
  'Wii U':                 { label: 'Wii U',        bg: '#009AC7', color: '#fff' },
  'Game Boy Advance':      { label: 'GBA',          bg: '#8B0000', color: '#fff' },
  'Nintendo DS':           { label: 'DS',           bg: '#CC0000', color: '#fff' },
  // PC
  'PC (Microsoft Windows)': { label: 'PC',         bg: '#1b2838', color: '#fff' },
  'Steam':                  { label: 'Steam',      bg: '#1b2838', color: '#fff' },
  'Mac':                    { label: 'Mac',        bg: '#555555', color: '#fff' },
  'Linux':                  { label: 'Linux',      bg: '#333333', color: '#fff' },
  // Mobile
  'Android':               { label: 'Android',    bg: '#3DDC84', color: '#000' },
  'iOS':                   { label: 'iOS',         bg: '#555555', color: '#fff' },
  'iPhone':                { label: 'iPhone',      bg: '#555555', color: '#fff' },
  'iPad':                  { label: 'iPad',        bg: '#555555', color: '#fff' },
  // Autres
  'Sega Mega Drive/Genesis': { label: 'Mega Drive', bg: '#17569C', color: '#fff' },
  'Sega Saturn':           { label: 'Saturn',      bg: '#17569C', color: '#fff' },
  'Sega Dreamcast':        { label: 'Dreamcast',   bg: '#17569C', color: '#fff' },
  'Epic Games Store':      { label: 'Epic',        bg: '#2F2F2F', color: '#fff' },
  'itch.io':               { label: 'itch.io',     bg: '#fa5c5c', color: '#fff' },
};

interface PlatformLogosProps {
  platforms: { name: string }[];
}

export default function PlatformLogos({ platforms }: PlatformLogosProps) {
  if (!platforms || platforms.length === 0) {
    return <Typography variant="body1">Non renseigné</Typography>;
  }

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
      {platforms.map(p => {
        const style = PLATFORM_MAP[p.name];
        return (
          <Chip
            key={p.name}
            label={style?.label ?? p.name}
            size="small"
            sx={{
              bgcolor: style?.bg ?? '#888',
              color: style?.color ?? '#fff',
              fontWeight: 700,
              fontSize: '0.7rem',
              letterSpacing: 0.5,
            }}
          />
        );
      })}
    </Box>
  );
}
