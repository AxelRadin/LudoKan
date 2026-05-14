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
import { useTranslation } from 'react-i18next';
import { saveConsent, useCookieConsent } from '../hooks/useCookieConsent';

const CookieBanner: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasChosen } = useCookieConsent();
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [prefs, setPrefs] = useState({
    analytics: false,
    personnalisation: false,
  });

  useEffect(() => {
    if (!hasChosen) setVisible(true);
  }, [hasChosen]);

  const save = (accepted: {
    analytics: boolean;
    personnalisation: boolean;
  }) => {
    saveConsent(accepted);
    setVisible(false);
  };

  const handleAcceptAll = () =>
    save({ analytics: true, personnalisation: true });
  const handleRefuseAll = () =>
    save({ analytics: false, personnalisation: false });
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
      <Box display="flex" alignItems="center" gap={1.5} mb={1.5}>
        <CookieOutlinedIcon sx={{ color: 'primary.main', fontSize: 22 }} />
        <Typography fontWeight={600} sx={{ color: 'secondary.main' }}>
          {t('cookieBanner.title')}
        </Typography>
      </Box>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 2, lineHeight: 1.7 }}
      >
        {t('cookieBanner.intro')}{' '}
        <Box
          component="span"
          onClick={() => navigate('/cookies')}
          sx={{
            color: 'primary.main',
            cursor: 'pointer',
            textDecoration: 'underline',
            fontSize: 'inherit',
          }}
        >
          {t('cookieBanner.learnMore')}
        </Box>
      </Typography>

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
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={1}
          >
            <Box>
              <Typography variant="body2" fontWeight={600}>
                {t('cookieBanner.necessary')}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t('cookieBanner.necessaryDesc')}
              </Typography>
            </Box>
            <Switch checked disabled size="small" color="success" />
          </Box>

          <Divider sx={{ my: 1.5 }} />

          <FormControlLabel
            control={
              <Switch
                checked={prefs.analytics}
                onChange={e =>
                  setPrefs(p => ({ ...p, analytics: e.target.checked }))
                }
                size="small"
                color="primary"
              />
            }
            label={
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  Analytics
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('cookieBanner.analyticsDesc')}
                </Typography>
              </Box>
            }
            labelPlacement="start"
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              ml: 0,
              width: '100%',
            }}
          />

          <Divider sx={{ my: 1.5 }} />

          <FormControlLabel
            control={
              <Switch
                checked={prefs.personnalisation}
                onChange={e =>
                  setPrefs(p => ({ ...p, personnalisation: e.target.checked }))
                }
                size="small"
                color="primary"
              />
            }
            label={
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  {t('cookieBanner.personalisationLabel')}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('cookieBanner.personalisationDesc')}
                </Typography>
              </Box>
            }
            labelPlacement="start"
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              ml: 0,
              width: '100%',
            }}
          />
        </Box>
      </Collapse>

      <Box display="flex" flexDirection="column" gap={1}>
        <Box display="flex" gap={1}>
          <Button
            fullWidth
            variant="contained"
            color="primary"
            onClick={handleAcceptAll}
            sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 600 }}
          >
            {t('cookieBanner.acceptAll')}
          </Button>
          <Button
            fullWidth
            variant="outlined"
            color="inherit"
            onClick={handleRefuseAll}
            sx={{
              textTransform: 'none',
              borderRadius: 2,
              color: 'text.secondary',
            }}
          >
            {t('cookieBanner.refuseAll')}
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
            {t('cookieBanner.saveChoice')}
          </Button>
        ) : (
          <Button
            fullWidth
            variant="text"
            onClick={() => setShowDetails(true)}
            sx={{
              textTransform: 'none',
              color: 'text.secondary',
              fontSize: 13,
            }}
          >
            {t('cookieBanner.customise')}
          </Button>
        )}
      </Box>
    </Paper>
  );
};

export default CookieBanner;
