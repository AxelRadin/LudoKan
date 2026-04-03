import { Box, Typography } from '@mui/material';
import LibraryGameCard from '../components/LibraryGameCard';
import { useUserGames } from '../hooks/useUserGames';

export default function UserLibraryPage() {
  const { games, loading, error, removeGame } = useUserGames();

  if (loading) return <p>Chargement de ta bibliothèque…</p>;
  if (error) return <p>Erreur : {error}</p>;

  if (!games.length) {
    return <p>Tu n'as encore aucun jeu dans ta bibliothèque.</p>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" fontWeight="bold" mb={3}>
        Ma bibliothèque de jeux
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 2,
        }}
      >
        {games.map(g => (
          <LibraryGameCard key={g.id} userGame={g} onRemove={removeGame} />
        ))}
      </Box>
    </Box>
  );
}
