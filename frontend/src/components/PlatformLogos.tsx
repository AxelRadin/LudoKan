import {
  SiAndroid,
  SiApple,
  SiEpicgames,
  SiItchdotio,
  SiNintendo3Ds,
  SiNintendoswitch,
  SiPlaystation,
  SiSega,
  SiSteam,
} from 'react-icons/si';
import { Tooltip, Box, Typography } from '@mui/material';
import { IconType } from 'react-icons';

function XboxIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M4.102 18.306C5.577 20.02 7.67 21.138 10.02 21.4c-1.828-.9-3.967-2.98-5.918-3.094zm15.796 0c-1.95.114-4.09 2.194-5.918 3.094 2.35-.262 4.443-1.38 5.918-3.094zM12 2C6.477 2 2 6.477 2 12c0 2.304.78 4.43 2.082 6.131.424-1.732 2.122-4.76 5.116-6.302C7.696 10.54 6.13 9.21 5.727 8.27 7.22 6.605 9.49 5.5 12 5.5s4.78 1.105 6.273 2.77c-.403.94-1.97 2.27-3.471 3.559 2.994 1.542 4.692 4.57 5.116 6.302C21.22 16.43 22 14.304 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
  );
}

type PlatformEntry =
  | { type: 'si'; icon: IconType; color: string; label: string }
  | { type: 'custom'; icon: React.FC<{ size: number; color: string }>; color: string; label: string };

import React from 'react';

const PLATFORM_MAP: Record<string, PlatformEntry> = {
  // PlayStation
  'PlayStation': { type: 'si', icon: SiPlaystation, color: '#003087', label: 'PlayStation' },
  'PlayStation 2': { type: 'si', icon: SiPlaystation, color: '#003087', label: 'PS2' },
  'PlayStation 3': { type: 'si', icon: SiPlaystation, color: '#003087', label: 'PS3' },
  'PlayStation 4': { type: 'si', icon: SiPlaystation, color: '#003087', label: 'PS4' },
  'PlayStation 5': { type: 'si', icon: SiPlaystation, color: '#003087', label: 'PS5' },
  'PlayStation Portable': { type: 'si', icon: SiPlaystation, color: '#003087', label: 'PSP' },
  'PlayStation Vita': { type: 'si', icon: SiPlaystation, color: '#003087', label: 'PS Vita' },
  // Xbox
  'Xbox': { type: 'custom', icon: XboxIcon, color: '#107C10', label: 'Xbox' },
  'Xbox 360': { type: 'custom', icon: XboxIcon, color: '#107C10', label: 'Xbox 360' },
  'Xbox One': { type: 'custom', icon: XboxIcon, color: '#107C10', label: 'Xbox One' },
  'Xbox Series X|S': { type: 'custom', icon: XboxIcon, color: '#107C10', label: 'Xbox Series' },
  'Xbox Series X': { type: 'custom', icon: XboxIcon, color: '#107C10', label: 'Xbox Series X' },
  // Nintendo
  'Nintendo Switch': { type: 'si', icon: SiNintendoswitch, color: '#E4000F', label: 'Switch' },
  'Nintendo Switch 2': { type: 'si', icon: SiNintendoswitch, color: '#E4000F', label: 'Switch 2' },
  'Nintendo 3DS': { type: 'si', icon: SiNintendo3Ds, color: '#CC0000', label: '3DS' },
  'New Nintendo 3DS': { type: 'si', icon: SiNintendo3Ds, color: '#CC0000', label: 'New 3DS' },
  'Wii': { type: 'si', icon: SiNintendo3Ds, color: '#009AC7', label: 'Wii' },
  'Wii U': { type: 'si', icon: SiNintendo3Ds, color: '#009AC7', label: 'Wii U' },
  // PC
  'PC (Microsoft Windows)': { type: 'si', icon: SiSteam, color: '#1b2838', label: 'PC' },
  'Steam': { type: 'si', icon: SiSteam, color: '#1b2838', label: 'Steam' },
  // Mobile
  'Android': { type: 'si', icon: SiAndroid, color: '#3DDC84', label: 'Android' },
  'iOS': { type: 'si', icon: SiApple, color: '#555555', label: 'iOS' },
  'iPhone': { type: 'si', icon: SiApple, color: '#555555', label: 'iPhone' },
  'iPad': { type: 'si', icon: SiApple, color: '#555555', label: 'iPad' },
  'Mac': { type: 'si', icon: SiApple, color: '#555555', label: 'Mac' },
  // Autres
  'Sega Mega Drive/Genesis': { type: 'si', icon: SiSega, color: '#17569C', label: 'Mega Drive' },
  'Sega Saturn': { type: 'si', icon: SiSega, color: '#17569C', label: 'Saturn' },
  'Sega Dreamcast': { type: 'si', icon: SiSega, color: '#17569C', label: 'Dreamcast' },
  'Epic Games Store': { type: 'si', icon: SiEpicgames, color: '#2F2F2F', label: 'Epic' },
  'itch.io': { type: 'si', icon: SiItchdotio, color: '#fa5c5c', label: 'itch.io' },
};

interface PlatformLogosProps {
  platforms: { nom_plateforme: string }[];
}

export default function PlatformLogos({ platforms }: PlatformLogosProps) {
  if (!platforms || platforms.length === 0) {
    return <Typography variant="body1">Non renseigné</Typography>;
  }

  const known: { entry: PlatformEntry; name: string }[] = [];
  const unknown: string[] = [];

  for (const p of platforms) {
    const entry = PLATFORM_MAP[p.nom_plateforme];
    if (entry) {
      known.push({ entry, name: p.nom_plateforme });
    } else {
      unknown.push(p.nom_plateforme);
    }
  }

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
      {known.map(({ entry, name }) => {
        const Icon = entry.icon;
        return (
          <Tooltip key={name} title={entry.label} arrow>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Icon size={28} color={entry.color} />
            </Box>
          </Tooltip>
        );
      })}
      {unknown.length > 0 && (
        <Typography variant="body2" color="text.secondary">
          {unknown.join(', ')}
        </Typography>
      )}
    </Box>
  );
}
