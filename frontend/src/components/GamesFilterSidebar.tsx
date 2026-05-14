import React from 'react';
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Divider,
  Button,
  useTheme,
  IconButton,
  Chip,
  Rating,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FilterListIcon from '@mui/icons-material/FilterList';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { useTranslation } from 'react-i18next';
import {
  IGDB_GENRES,
  IGDB_PLATFORMS,
  IGDB_THEMES,
  IGDB_GAME_MODES,
} from '../constants/igdbConstants';
import type { IgdbListFilters } from '../api/igdb';

interface GamesFilterSidebarProps {
  filters: IgdbListFilters;
  onFiltersChange: (newFilters: IgdbListFilters) => void;
  onReset: () => void;
}

export const GamesFilterSidebar: React.FC<GamesFilterSidebarProps> = ({
  filters,
  onFiltersChange,
  onReset,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const handleToggleId = (
    field: keyof IgdbListFilters,
    id: number,
    checked: boolean
  ) => {
    const current = (filters[field] as number[]) || [];
    const next = checked
      ? [...current, id]
      : current.filter(existing => existing !== id);
    onFiltersChange({ ...filters, [field]: next });
  };

  const handleSliderChange = (field: keyof IgdbListFilters, value: number) => {
    onFiltersChange({ ...filters, [field]: value });
  };

  const activeFiltersCount = Object.entries(filters).reduce((acc, [_, val]) => {
    if (Array.isArray(val)) return acc + val.length;
    if (val != null) return acc + 1;
    return acc;
  }, 0);

  const SectionTitle = ({
    title,
    icon,
  }: {
    title: string;
    icon?: React.ReactNode;
  }) => (
    <Box display="flex" alignItems="center" gap={1}>
      {icon}
      <Typography
        variant="subtitle2"
        sx={{
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          fontSize: '0.75rem',
          color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
        }}
      >
        {title}
      </Typography>
    </Box>
  );

  return (
    <Box
      sx={{
        width: '100%',
        background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
        borderRadius: '24px',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
        overflow: 'hidden',
        position: 'sticky',
        top: 100,
      }}
    >
      <Box
        sx={{
          p: 2.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box display="flex" alignItems="center" gap={1.5}>
          <FilterListIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 800, fontSize: '1.1rem' }}>
            {t('games.filters.title', 'Filtres')}
          </Typography>
          {activeFiltersCount > 0 && (
            <Chip
              label={activeFiltersCount}
              size="small"
              color="primary"
              sx={{ fontWeight: 800, height: 20, fontSize: '0.7rem' }}
            />
          )}
        </Box>
        <IconButton
          size="small"
          onClick={onReset}
          title={t('common.reset', 'Réinitialiser')}
        >
          <RestartAltIcon fontSize="small" />
        </IconButton>
      </Box>

      <Divider />

      <Box sx={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto', p: 1 }}>
        {/* GENRES */}
        <Accordion
          defaultExpanded
          elevation={0}
          sx={{ background: 'transparent' }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <SectionTitle title={t('games.filters.genres', 'Genres')} />
          </AccordionSummary>
          <AccordionDetails>
            <FormGroup>
              {IGDB_GENRES.map(g => (
                <FormControlLabel
                  key={g.id}
                  control={
                    <Checkbox
                      size="small"
                      checked={(filters.genre || []).includes(g.id)}
                      onChange={e =>
                        handleToggleId('genre', g.id, e.target.checked)
                      }
                    />
                  }
                  label={
                    <Typography variant="body2">
                      {t(`genres.${g.name}`, g.name)}
                    </Typography>
                  }
                />
              ))}
            </FormGroup>
          </AccordionDetails>
        </Accordion>

        {/* PLATFORMS */}
        <Accordion elevation={0} sx={{ background: 'transparent' }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <SectionTitle title={t('games.filters.platforms', 'Plateformes')} />
          </AccordionSummary>
          <AccordionDetails>
            <FormGroup>
              {IGDB_PLATFORMS.map(p => (
                <FormControlLabel
                  key={p.id}
                  control={
                    <Checkbox
                      size="small"
                      checked={(filters.platform || []).includes(p.id)}
                      onChange={e =>
                        handleToggleId('platform', p.id, e.target.checked)
                      }
                    />
                  }
                  label={<Typography variant="body2">{p.name}</Typography>}
                />
              ))}
            </FormGroup>
          </AccordionDetails>
        </Accordion>

        {/* THEMES */}
        <Accordion elevation={0} sx={{ background: 'transparent' }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <SectionTitle title={t('games.filters.themes', 'Thèmes')} />
          </AccordionSummary>
          <AccordionDetails>
            <FormGroup>
              {IGDB_THEMES.map(t_ => (
                <FormControlLabel
                  key={t_.id}
                  control={
                    <Checkbox
                      size="small"
                      checked={(filters.theme || []).includes(t_.id)}
                      onChange={e =>
                        handleToggleId('theme', t_.id, e.target.checked)
                      }
                    />
                  }
                  label={<Typography variant="body2">{t_.name}</Typography>}
                />
              ))}
            </FormGroup>
          </AccordionDetails>
        </Accordion>

        {/* GAME MODES */}
        <Accordion elevation={0} sx={{ background: 'transparent' }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <SectionTitle
              title={t('games.filters.gameModes', 'Modes de jeu')}
            />
          </AccordionSummary>
          <AccordionDetails>
            <FormGroup>
              {IGDB_GAME_MODES.map(m => (
                <FormControlLabel
                  key={m.id}
                  control={
                    <Checkbox
                      size="small"
                      checked={(filters.game_mode || []).includes(m.id)}
                      onChange={e =>
                        handleToggleId('game_mode', m.id, e.target.checked)
                      }
                    />
                  }
                  label={<Typography variant="body2">{m.name}</Typography>}
                />
              ))}
            </FormGroup>
          </AccordionDetails>
        </Accordion>

        {/* Rating */}
        <Accordion
          defaultExpanded
          elevation={0}
          sx={{ background: 'transparent' }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <SectionTitle
              title={t('games.filters.minRating', 'Note minimale')}
            />
          </AccordionSummary>
          <AccordionDetails>
            <Box
              px={1}
              display="flex"
              flexDirection="column"
              alignItems="center"
              gap={1}
            >
              <Rating
                value={(filters.min_rating || 0) / 20}
                precision={0.5}
                onChange={(_, newValue) =>
                  handleSliderChange('min_rating', (newValue || 0) * 20)
                }
                size="large"
              />
              <Typography variant="caption" color="text.secondary">
                {filters.min_rating
                  ? `${filters.min_rating}% +`
                  : t('common.all', 'Tous')}
              </Typography>
            </Box>
          </AccordionDetails>
        </Accordion>

        <Divider sx={{ my: 1, opacity: 0.5 }} />

        {/* Age */}
        <Accordion
          defaultExpanded
          elevation={0}
          sx={{ background: 'transparent' }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <SectionTitle title={t('games.filters.minAge', 'Âge minimal')} />
          </AccordionSummary>
          <AccordionDetails>
            <Box px={1}>
              <ToggleButtonGroup
                value={filters.min_age}
                exclusive
                onChange={(_, val) => handleSliderChange('min_age', val)}
                fullWidth
                size="small"
                sx={{
                  flexWrap: 'wrap',
                  gap: 1,
                  '& .MuiToggleButtonGroup-grouped': {
                    border: '1px solid !important',
                    borderRadius: '8px !important',
                  },
                }}
              >
                {[3, 7, 12, 16, 18].map(age => (
                  <ToggleButton key={age} value={age} sx={{ px: 2, py: 1 }}>
                    {age}+
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>
          </AccordionDetails>
        </Accordion>

        <Divider sx={{ my: 1, opacity: 0.5 }} />

        {/* Players */}
        <Accordion
          defaultExpanded
          elevation={0}
          sx={{ background: 'transparent' }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <SectionTitle
              title={t('games.filters.minPlayers', 'Joueurs min.')}
            />
          </AccordionSummary>
          <AccordionDetails>
            <Box px={1}>
              <ToggleButtonGroup
                value={filters.min_players}
                exclusive
                onChange={(_, val) => handleSliderChange('min_players', val)}
                fullWidth
                size="small"
                sx={{
                  flexWrap: 'wrap',
                  gap: 1,
                  '& .MuiToggleButtonGroup-grouped': {
                    border: '1px solid !important',
                    borderRadius: '8px !important',
                  },
                }}
              >
                {[1, 2, 4, 8].map(p => (
                  <ToggleButton key={p} value={p} sx={{ px: 2, py: 1 }}>
                    {p === 8 ? '8+' : p}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>
          </AccordionDetails>
        </Accordion>
      </Box>

      <Box sx={{ p: 2 }}>
        <Button
          fullWidth
          variant="contained"
          onClick={onReset}
          startIcon={<RestartAltIcon />}
          sx={{
            borderRadius: '12px',
            textTransform: 'none',
            fontWeight: 700,
            boxShadow: 'none',
          }}
        >
          {t('common.resetAll', 'Tout réinitialiser')}
        </Button>
      </Box>
    </Box>
  );
};
