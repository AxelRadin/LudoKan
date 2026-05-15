import { BarChart } from '@mui/x-charts/BarChart';
import { LineChart } from '@mui/x-charts/LineChart';
import { PieChart } from '@mui/x-charts/PieChart';
import { Box, Grid, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { AdminStats } from '../../types/admin';

type Props = Readonly<{
  data: AdminStats;
}>;

function shortDateLabel(iso: string): string {
  const parts = iso.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
  return iso;
}

function EmptyChartMessage({ text }: Readonly<{ text: string }>) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 200,
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        bgcolor: 'action.hover',
        px: 2,
      }}
    >
      <Typography variant="body2" color="text.secondary" textAlign="center">
        {text}
      </Typography>
    </Box>
  );
}

export default function AdminDashboardCharts({ data }: Props) {
  const theme = useTheme();

  const { charts } = data;
  const usersDaily = charts.users_daily ?? [];
  const gamesTop = charts.games_top ?? [];
  const genresShare = charts.genres_share ?? [];

  const palette = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.info.main,
    theme.palette.error.light,
  ];

  return (
    <Box sx={{ mb: 4 }}>
      <Typography
        variant="h6"
        sx={{
          fontWeight: 700,
          mb: 2,
          fontSize: 14,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'text.secondary',
        }}
      >
        Tendances
      </Typography>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <Box
            sx={{
              p: 2,
              border: 1,
              borderColor: 'divider',
              borderRadius: 2,
              bgcolor: 'background.paper',
              width: '100%',
              minWidth: 0,
              overflowX: 'auto',
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Utilisateurs (14 derniers jours)
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mb: 1 }}
            >
              Nouveaux comptes (création) et connexions distinctes par jour.
            </Typography>
            <LineChart
              dataset={usersDaily}
              xAxis={[
                {
                  scaleType: 'band',
                  dataKey: 'date',
                  valueFormatter: (value: string | null) =>
                    value ? shortDateLabel(value) : '',
                },
              ]}
              series={[
                {
                  dataKey: 'new_users',
                  label: 'Nouveaux comptes',
                  color: theme.palette.primary.main,
                },
                {
                  dataKey: 'active_logins',
                  label: 'Connexions',
                  color: theme.palette.secondary.main,
                },
              ]}
              height={280}
              margin={{ left: 48, right: 16, top: 24, bottom: 40 }}
              grid={{ horizontal: true, vertical: true }}
              sx={{ minWidth: 480 }}
            />
          </Box>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Box
            sx={{
              p: 2,
              border: 1,
              borderColor: 'divider',
              borderRadius: 2,
              bgcolor: 'background.paper',
              minWidth: 0,
              height: '100%',
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Jeux les plus commentés
            </Typography>
            {gamesTop.length === 0 ? (
              <EmptyChartMessage text="Aucun jeu avec des avis pour l’instant." />
            ) : (
              <BarChart
                layout="horizontal"
                dataset={gamesTop}
                yAxis={[{ scaleType: 'band', dataKey: 'name', width: 120 }]}
                xAxis={[{ min: 0 }]}
                series={[
                  {
                    dataKey: 'reviews',
                    label: 'Avis',
                    color: theme.palette.primary.main,
                  },
                ]}
                height={Math.min(360, 80 + gamesTop.length * 36)}
                margin={{ left: 8, right: 16, top: 16, bottom: 32 }}
                grid={{ horizontal: true, vertical: true }}
              />
            )}
          </Box>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Box
            sx={{
              p: 2,
              border: 1,
              borderColor: 'divider',
              borderRadius: 2,
              bgcolor: 'background.paper',
              minWidth: 0,
              height: '100%',
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
              Répartition par genre (jeux)
            </Typography>
            {genresShare.length === 0 ? (
              <EmptyChartMessage text="Aucun genre associé à des jeux pour l’instant." />
            ) : (
              <PieChart
                series={[
                  {
                    type: 'pie',
                    innerRadius: 48,
                    outerRadius: 100,
                    paddingAngle: 1.5,
                    cornerRadius: 3,
                    data: genresShare.map((g, i) => ({
                      id: g.name,
                      value: g.count,
                      label: g.name,
                      color: palette[i % palette.length],
                    })),
                  },
                ]}
                height={300}
                margin={{ top: 8, bottom: 8, left: 8, right: 8 }}
              />
            )}
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
