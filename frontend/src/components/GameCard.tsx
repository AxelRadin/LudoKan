import { Card, CardMedia } from '@mui/material';
import { useNavigate } from 'react-router-dom';

interface GameCardProps {
  id: number;
  title: string;
  image: string;
}

export const GameCard: React.FC<GameCardProps> = ({ id, title, image }) => {
  const navigate = useNavigate();

  return (
    <Card
      onClick={() => navigate(`/game/${id}`)}
      sx={{
        minWidth: 150,
        borderRadius: 2,
        flexShrink: 0,
        cursor: 'pointer',
      }}
    >
      <CardMedia
        component="img"
        height="200"
        image={image}
        alt={title}
        sx={{ objectFit: 'cover' }}
      />
    </Card>
  );
};

export default GameCard;
