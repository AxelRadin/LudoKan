import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
} from '@mui/material';

interface ConfirmCancelMatchmakingModalProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export default function ConfirmCancelMatchmakingModal({
    open,
    onClose,
    onConfirm,
}: ConfirmCancelMatchmakingModalProps) {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-description"
            PaperProps={{
                sx: { borderRadius: 3, p: 1, zIndex: 10000 }
            }}
        >
            <DialogTitle id="confirm-dialog-title" sx={{ fontWeight: 'bold' }}>
                Recherche déjà en cours
            </DialogTitle>

            <DialogContent>
                <DialogContentText id="confirm-dialog-description">
                    Vous avez déjà une recherche de joueurs active. Voulez-vous annuler la recherche précédente et en lancer une nouvelle ?
                </DialogContentText>
            </DialogContent>

            <DialogActions sx={{ pb: 2, px: 3, justifyContent: 'space-between' }}>
                <Button onClick={onClose} color="inherit" sx={{ fontWeight: 600 }}>
                    Non, garder l'actuelle
                </Button>
                <Button
                    onClick={onConfirm}
                    color="primary"
                    variant="contained"
                    sx={{ fontWeight: 600, borderRadius: 2 }}
                >
                    Oui, nouvelle recherche
                </Button>
            </DialogActions>
        </Dialog>
    );
}