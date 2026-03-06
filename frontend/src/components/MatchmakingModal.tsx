import AccessTimeIcon from '@mui/icons-material/AccessTime';
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
import { useEffect, useState } from 'react';

interface Match {
    id: number;
    user: any;
    distance_km: number;
}

interface MatchmakingModalProps {
    open: boolean;
    onClose: () => void;
    matches: Match[];
    startedAt: Date | null;
}

export default function MatchmakingModal({
    open,
    onClose,
    matches,
    startedAt,
}: MatchmakingModalProps) {
    const [elapsedTime, setElapsedTime] = useState<string>('0:00');

    useEffect(() => {
        if (!startedAt) return;

        const updateTimer = () => {
            const now = new Date();
            const diffInSeconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000);

            if (diffInSeconds >= 0) {
                const minutes = Math.floor(diffInSeconds / 60);
                const seconds = diffInSeconds % 60;
                setElapsedTime(`${minutes}:${seconds.toString().padStart(2, '0')}`);
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);

        return () => clearInterval(interval);
    }, [startedAt]);

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontWeight: 'bold', textAlign: 'center' }}>
                Joueurs à proximité
            </DialogTitle>

            <DialogContent dividers>
                {startedAt && (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3, gap: 1, color: 'text.secondary' }}>
                        <AccessTimeIcon fontSize="small" />
                        <Typography variant="body2" fontWeight="bold">
                            Temps de recherche : {elapsedTime}
                        </Typography>
                    </Box>
                )}

                {matches.length > 0 ? (
                    <List>
                        {matches.map((match) => {
                            const userName =
                                typeof match.user === 'object' && match.user?.username
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
                            La recherche continue en arrière-plan. Vous serez averti dès qu'un joueur sera trouvé !
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