import PersonIcon from '@mui/icons-material/Person';
import {
    Avatar,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    Typography,
} from '@mui/material';

interface Match {
    id: number;
    user: any;
    distance_km: number;
}

interface MatchmakingModalProps {
    open: boolean;
    onClose: () => void;
    matches: Match[];
}

export default function MatchmakingModal({
    open,
    onClose,
    matches,
}: MatchmakingModalProps) {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontWeight: 'bold', textAlign: 'center' }}>
                Joueurs à proximité
            </DialogTitle>

            <DialogContent dividers>
                {matches.length > 0 ? (
                    <List>
                        {matches.map((match) => {
                            // Gère le cas où "user" est juste un ID ou un objet complet
                            const userName = typeof match.user === 'object' && match.user?.username
                                ? match.user.username
                                : `Joueur #${typeof match.user === 'object' ? match.user?.id : match.user}`;

                            return (
                                <ListItem key={match.id} divider>
                                    <ListItemAvatar>
                                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                                            <PersonIcon />
                                        </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={userName}
                                        secondary={`À environ ${match.distance_km} km`}
                                        primaryTypographyProps={{ fontWeight: 600 }}
                                    />
                                    <Button variant="outlined" size="small" color="primary">
                                        Contacter
                                    </Button>
                                </ListItem>
                            );
                        })}
                    </List>
                ) : (
                    <Box sx={{ py: 4, textAlign: 'center' }}>
                        <Typography variant="body1" color="text.secondary" gutterBottom>
                            Aucun joueur trouvé près de vous pour l'instant.
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Votre demande reste active ! Vous recevrez une notification si un joueur cherche ce jeu dans votre zone.
                        </Typography>
                    </Box>
                )}
            </DialogContent>

            <DialogActions sx={{ justifyContent: 'center', pb: 2 }}>
                <Button onClick={onClose} color="inherit" variant="text">
                    Fermer
                </Button>
            </DialogActions>
        </Dialog>
    );
}