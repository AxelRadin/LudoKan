import { BarChart } from '@mui/x-charts/BarChart';
import { LineChart } from '@mui/x-charts/LineChart';
import { PieChart } from '@mui/x-charts/PieChart';
import { Box, Grid, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import type { AdminStatsInsights } from '../../types/admin';

type Props = Readonly<{
  data: AdminStatsInsights;
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
        minHeight: 180,
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

export default function AdminStatsInsightsCharts({ data }: Props) {
  const theme = useTheme();
  const palette = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.info.main,
    theme.palette.error.light,
  ];

  const supportDataset = data.support_by_status.map(row => ({
    label: row.label,
    count: row.count,
  }));

  const gamesPieData = data.games_by_status.map((g, i) => ({
    id: g.status || `empty-${i}`,
    value: g.count,
    label: g.label,
    color: palette[i % palette.length],
  }));

  return (
    <Box sx={{ mb: 2 }}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <Box
            sx={{
              p: 2,
              border: 1,
              borderColor: 'divider',
              borderRadius: 2,
              bgcolor: 'background.paper',
              minWidth: 0,
              overflowX: 'auto',
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
              Avis et notes créés (30 jours)
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mb: 1 }}
            >
              Volume quotidien d&apos;avis et de notes enregistrés.
            </Typography>
            <LineChart
              dataset={data.reviews_ratings_daily}
              xAxis={[
                {
                  scaleType: 'band',
                  dataKey: 'date',
                  valueFormatter: (v: string | null) =>
                    v ? shortDateLabel(v) : '',
                },
              ]}
              series={[
                {
                  dataKey: 'reviews',
                  label: 'Avis',
                  color: theme.palette.primary.main,
                },
                {
                  dataKey: 'ratings',
                  label: 'Notes',
                  color: theme.palette.secondary.main,
                },
              ]}
              height={300}
              margin={{ left: 52, right: 16, top: 24, bottom: 44 }}
              grid={{ horizontal: true, vertical: true }}
              sx={{ minWidth: 520 }}
            />
          </Box>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Box
            sx={{
              p: 2,
              border: 1,
              borderColor: 'divider',
              borderRadius: 2,
              bgcolor: 'background.paper',
              minWidth: 0,
              overflowX: 'auto',
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
              Signalements et messages (14 jours)
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mb: 1 }}
            >
              Rapports de contenu vs messages chat.
            </Typography>
            <LineChart
              dataset={data.reports_messages_daily}
              xAxis={[
                {
                  scaleType: 'band',
                  dataKey: 'date',
                  valueFormatter: (v: string | null) =>
                    v ? shortDateLabel(v) : '',
                },
              ]}
              series={[
                {
                  dataKey: 'reports',
                  label: 'Signalements',
                  color: theme.palette.warning.main,
                },
                {
                  dataKey: 'messages',
                  label: 'Messages',
                  color: theme.palette.info.main,
                },
              ]}
              height={280}
              margin={{ left: 52, right: 16, top: 24, bottom: 44 }}
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
              Tickets support par statut
            </Typography>
            {supportDataset.length === 0 ? (
              <EmptyChartMessage text="Aucun ticket en base." />
            ) : (
              <BarChart
                dataset={supportDataset}
                xAxis={[{ scaleType: 'band', dataKey: 'label' }]}
                series={[
                  {
                    dataKey: 'count',
                    label: 'Tickets',
                    color: theme.palette.primary.main,
                  },
                ]}
                height={300}
                margin={{ left: 48, right: 16, top: 16, bottom: 72 }}
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
              Jeux par statut de publication
            </Typography>
            {gamesPieData.length === 0 ? (
              <EmptyChartMessage text="Aucun jeu en base." />
            ) : (
              <PieChart
                series={[
                  {
                    type: 'pie',
                    innerRadius: 40,
                    outerRadius: 100,
                    paddingAngle: 1.5,
                    cornerRadius: 3,
                    data: gamesPieData,
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
