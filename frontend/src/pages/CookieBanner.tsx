import CookieOutlinedIcon from '@mui/icons-material/CookieOutlined';
import {
  Box,
  Button,
  Collapse,
  Divider,
  FormControlLabel,
  Paper,
  Switch,
  Typography,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const COOKIE_KEY = 'ludokan_cookie_consent';

interface CookiePreferences {
  analytics: boolean;
  personnalisation: boolean;
}

const defaultPrefs: CookiePreferences = {
  analytics: false,
  personnalisation: false,
};

const CookieBanner: React.FC = () => {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [prefs, setPrefs] = useState<CookiePreferences>(defaultPrefs);

  useEffect(() => {
    const saved = localStorage.getItem(COOKIE_KEY);
    if (!saved) {
      setVisible(true);
    }
  }, []);

  const save = (accepted: CookiePreferences) => {
    localStorage.setItem(COOKIE_KEY, JSON.stringify({ ...accepted, necessary: true }));
    setVisible(false);
  };

  const handleAcceptAll = () => save({ analytics: true, personnalisation: true });
  const handleRefuseAll = () => save({ analytics: false, personnalisation: false });
  const handleSaveChoice = () => save(prefs);

  if (!visible) return null;

  return (
    <Paper
      elevation={6}
      sx={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        width: { xs: '95vw', sm: 520 },
        borderRadius: 4,
        p: 3,
        zIndex: 2000,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      {/* En-tête */}
      <Box display="flex" alignItems="center" gap={1.5} mb={1.5}>
        <CookieOutlinedIcon sx={{ color: 'primary.main', fontSize: 22 }} />
        <Typography fontWeight={600} sx={{ color: 'secondary.main' }}>
          Gestion des cookies
        </Typography>
      </Box>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.7 }}>
        Nous utilisons des cookies pour assurer le bon fonctionnement de Ludokan et améliorer
        votre expérience. Vous pouvez accepter, refuser ou personnaliser vos choix.{' '}
        <Box
          component="span"
          onClick={() => navigate('/cookies')}
          sx={{ color: 'primary.main', cursor: 'pointer', textDecoration: 'underline', fontSize: 'inherit' }}
        >
          En savoir plus
        </Box>
      </Typography>

      {/* Détails personnalisables */}
      <Collapse in={showDetails}>
        <Box
          sx={{
            mb: 2,
            p: 2,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.default',
          }}
        >
          {/* Nécessaires — toujours activés */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Box>
              <Typography variant="body2" fontWeight={600}>Nécessaires</Typography>
              <Typography variant="caption" color="text.secondary">Indispensables au fonctionnement</Typography>
            </Box>
            <Switch checked disabled size="small" color="success" />
          </Box>

          <Divider sx={{ my: 1.5 }} />

          {/* Analytics */}
          <FormControlLabel
            control={
              <Switch
                checked={prefs.analytics}
                onChange={(e) => setPrefs((p) => ({ ...p, analytics: e.target.checked }))}
                size="small"
                color="primary"
              />
            }
            label={
              <Box>
                <Typography variant="body2" fontWeight={600}>Analytics</Typography>
                <Typography variant="caption" color="text.secondary">Mesure d'audience anonymisée</Typography>
              </Box>
            }
            labelPlacement="start"
            sx={{ display: 'flex', justifyContent: 'space-between', ml: 0, width: '100%' }}
          />

          <Divider sx={{ my: 1.5 }} />

          {/* Personnalisation */}
          <FormControlLabel
            control={
              <Switch
                checked={prefs.personnalisation}
                onChange={(e) => setPrefs((p) => ({ ...p, personnalisation: e.target.checked }))}
                size="small"
                color="primary"
              />
            }
            label={
              <Box>
                <Typography variant="body2" fontWeight={600}>Personnalisation</Typography>
                <Typography variant="caption" color="text.secondary">Thème, préférences, recommandations</Typography>
              </Box>
            }
            labelPlacement="start"
            sx={{ display: 'flex', justifyContent: 'space-between', ml: 0, width: '100%' }}
          />
        </Box>
      </Collapse>

      {/* Boutons */}
      <Box display="flex" flexDirection="column" gap={1}>
        <Box display="flex" gap={1}>
          <Button
            fullWidth
            variant="contained"
            color="primary"
            onClick={handleAcceptAll}
            sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}
          >
            Tout accepter
          </Button>
          <Button
            fullWidth
            variant="outlined"
            color="inherit"
            onClick={handleRefuseAll}
            sx={{ textTransform: 'none', borderRadius: 2, color: 'text.secondary' }}
          >
            Tout refuser
          </Button>
        </Box>

        {showDetails ? (
          <Button
            fullWidth
            variant="outlined"
            color="primary"
            onClick={handleSaveChoice}
            sx={{ textTransform: 'none', borderRadius: 2 }}
          >
            Enregistrer mes choix
          </Button>
        ) : (
          <Button
            fullWidth
            variant="text"
            onClick={() => setShowDetails(true)}
            sx={{ textTransform: 'none', color: 'text.secondary', fontSize: 13 }}
          >
            Personnaliser
          </Button>
        )}
      </Box>
    </Paper>
  );
};

export default CookieBanner;
