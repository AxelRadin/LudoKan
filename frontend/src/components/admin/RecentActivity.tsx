import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import RateReviewOutlinedIcon from '@mui/icons-material/RateReviewOutlined';
import SportsEsportsOutlinedIcon from '@mui/icons-material/SportsEsportsOutlined';
import SupportAgentOutlinedIcon from '@mui/icons-material/SupportAgentOutlined';
import {
  Box,
  Button,
  Chip,
  Divider,
  Typography,
  type SvgIconProps,
} from '@mui/material';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import { formatAdminActionTypeLabel } from '../../constants/adminActionTypes';
import { useAuth } from '../../contexts/useAuth';
import type { AdminStats } from '../../types/admin';
import { hasPermission } from '../../utils/adminPermissions';
import { relativeTimeFromNow } from '../../utils/relativeTimeFromNow';
import LoadingSkeleton from './LoadingSkeleton';

const WIDGET_LIMIT = 10;

type Props = Readonly<{
  data: AdminStats | null;
  loading: boolean;
}>;

function iconForAction(action: string | null): ReactElement<SvgIconProps> {
  if (action?.startsWith('game')) {
    return <SportsEsportsOutlinedIcon fontSize="small" />;
  }

  if (action?.startsWith('review') || action?.startsWith('rating')) {
    return <RateReviewOutlinedIcon fontSize="small" />;
  }

  if (action?.startsWith('user')) {
    return <PersonOutlineIcon fontSize="small" />;
  }

  if (action?.startsWith('support')) {
    return <SupportAgentOutlinedIcon fontSize="small" />;
  }

  if (action?.startsWith('system')) {
    return <AdminPanelSettingsOutlinedIcon fontSize="small" />;
  }

  return <HistoryOutlinedIcon fontSize="small" />;
}

function targetLabelForAction(action: string | null): string {
  if (action?.startsWith('game')) return 'Jeu';
  if (action?.startsWith('review')) return 'Avis';
  if (action?.startsWith('rating')) return 'Note';
  if (action?.startsWith('user')) return 'Utilisateur';
  if (action?.startsWith('support')) return 'Support';
  if (action?.startsWith('system')) return 'Système';

  return 'Cible';
}

function renderRecentActivity(
  data: AdminStats | null,
  loading: boolean,
  lang: string
) {
  if (loading || !data) {
    return <LoadingSkeleton variant="table" count={3} />;
  }

  if (data.recent_activity.length === 0) {
    return (
      <Box
        sx={{
          border: 1,
          borderColor: 'divider',
          borderRadius: 2,
          p: 2,
          bgcolor: 'action.hover',
        }}
      >
        <Typography
          variant="body2"
          sx={{ color: 'text.secondary', fontSize: 13 }}
        >
          Aucune activité récente.
        </Typography>
      </Box>
    );
  }

  const slice = data.recent_activity.slice(0, WIDGET_LIMIT);

  return (
    <Box sx={{ display: 'grid', gap: 1 }}>
      {slice.map(activity => (
        <Box
          key={activity.id}
          sx={{
            display: 'grid',
            gridTemplateColumns: '36px minmax(0, 1fr)',
            gap: 1.5,
            alignItems: 'flex-start',
            p: 1.25,
            border: 1,
            borderColor: 'divider',
            borderRadius: 2,
            bgcolor: 'background.default',
            transition: theme =>
              theme.transitions.create(['background-color', 'border-color'], {
                duration: theme.transitions.duration.shortest,
              }),
            '&:hover': {
              bgcolor: 'action.hover',
              borderColor: 'text.disabled',
            },
          }}
        >
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              bgcolor: 'background.paper',
              border: 1,
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'text.secondary',
            }}
          >
            {iconForAction(activity.action)}
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
                mb: 0.5,
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 700,
                  fontSize: 13,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {activity.action
                  ? formatAdminActionTypeLabel(activity.action)
                  : 'Action inconnue'}
              </Typography>

              {activity.time ? (
                <Typography
                  variant="caption"
                  sx={{
                    color: 'text.disabled',
                    fontSize: 10.5,
                    flexShrink: 0,
                  }}
                >
                  {relativeTimeFromNow(activity.time, lang)}
                </Typography>
              ) : null}
            </Box>

            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontSize: 11.5,
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              <strong>Auteur :</strong> {activity.actor ?? '—'}
            </Typography>

            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontSize: 11.5,
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              <strong>{targetLabelForAction(activity.action)} :</strong>{' '}
              {activity.target ?? '—'}
            </Typography>
          </Box>
        </Box>
      ))}
    </Box>
  );
}

function EngagementItem({
  label,
  value,
}: Readonly<{
  label: string;
  value: number;
}>) {
  return (
    <Box
      sx={{
        p: 1.5,
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        bgcolor: 'background.default',
      }}
    >
      <Typography
        variant="caption"
        sx={{
          display: 'block',
          color: 'text.secondary',
          fontSize: 11,
          mb: 0.5,
        }}
      >
        {label}
      </Typography>

      <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
        {value}
      </Typography>
    </Box>
  );
}

export default function RecentActivity({ data, loading }: Props) {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const canSeeAll = hasPermission(user, 'admin_action_read');

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          lg: 'minmax(0, 1.45fr) minmax(320px, 0.55fr)',
        },
        gap: 3,
        mb: 4,
      }}
    >
      <Box
        sx={{
          bgcolor: 'background.paper',
          border: 1,
          borderColor: 'divider',
          borderRadius: 3,
          p: { xs: 2, md: 3 },
          minWidth: 0,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 2,
            mb: 2.5,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Chip
              size="small"
              label="Activité"
              icon={<HistoryOutlinedIcon />}
              sx={{
                height: 24,
                mb: 1,
                fontSize: 11,
                fontWeight: 700,
                '& .MuiChip-icon': {
                  fontSize: 16,
                },
              }}
            />

            <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
              Activité admin récente
            </Typography>

            <Typography
              variant="body2"
              sx={{ color: 'text.secondary', fontSize: 13, mt: 0.5 }}
            >
              Les dernières actions réalisées sur la plateforme.
            </Typography>
          </Box>

          {canSeeAll ? (
            <Button
              component={RouterLink}
              to="/admin/activity"
              size="small"
              variant="outlined"
              sx={{
                flexShrink: 0,
                fontSize: 12,
                fontWeight: 700,
                borderRadius: 999,
                px: 1.5,
              }}
            >
              Voir tout
            </Button>
          ) : null}
        </Box>

        {renderRecentActivity(data, loading, i18n.language)}
      </Box>

      <Box
        sx={{
          bgcolor: 'background.paper',
          border: 1,
          borderColor: 'divider',
          borderRadius: 3,
          p: { xs: 2, md: 3 },
          minWidth: 0,
        }}
      >
        <Chip
          size="small"
          label="Engagement"
          icon={<PersonOutlineIcon />}
          sx={{
            height: 24,
            mb: 1,
            fontSize: 11,
            fontWeight: 700,
            '& .MuiChip-icon': {
              fontSize: 16,
            },
          }}
        />

        <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
          Engagement
        </Typography>

        <Typography
          variant="body2"
          sx={{ color: 'text.secondary', fontSize: 13, mt: 0.5, mb: 2 }}
        >
          Vue rapide de l’activité utilisateur.
        </Typography>

        <Divider sx={{ mb: 2 }} />

        {loading || !data ? (
          <LoadingSkeleton variant="table" count={3} />
        ) : (
          <Box sx={{ display: 'grid', gap: 1.25 }}>
            <EngagementItem
              label="Actifs aujourd’hui"
              value={data.engagement.active_day}
            />

            <EngagementItem
              label="Actifs cette semaine"
              value={data.engagement.active_week}
            />

            <EngagementItem
              label="Messages ce mois"
              value={data.engagement.messages_last_30d}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
}
