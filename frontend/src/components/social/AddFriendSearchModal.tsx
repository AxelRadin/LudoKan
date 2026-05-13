import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import {
  searchUsersForFriends,
  sendFriendRequest,
  type UserSearchHit,
} from '../../api/social';
import { useAuth } from '../../contexts/useAuth';

type AddFriendSearchModalProps = Readonly<{
  open: boolean;
  onClose: () => void;
  /** Après une invitation envoyée (ou acceptation auto). */
  onInviteSuccess?: () => void;
  onInviteError?: () => void;
}>;

export default function AddFriendSearchModal({
  open,
  onClose,
  onInviteSuccess,
  onInviteError,
}: AddFriendSearchModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [results, setResults] = useState<UserSearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [invitingId, setInvitingId] = useState<number | null>(null);

  useEffect(() => {
    const tmr = globalThis.setTimeout(() => setDebounced(query.trim()), 350);
    return () => globalThis.clearTimeout(tmr);
  }, [query]);

  const runSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const rows = await searchUsersForFriends(q);
      setResults(rows);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    runSearch(debounced).catch(() => {});
  }, [debounced, open, runSearch]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setDebounced('');
      setResults([]);
      setInvitingId(null);
    }
  }, [open]);

  const handleInvite = async (hit: UserSearchHit) => {
    if (!authUser || hit.id === authUser.id) return;
    setInvitingId(hit.id);
    try {
      await sendFriendRequest({ to_user_id: hit.id });
      onInviteSuccess?.();
    } catch {
      onInviteError?.();
    } finally {
      setInvitingId(null);
    }
  };

  let searchResultsSection: ReactNode;
  if (loading) {
    searchResultsSection = (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={32} />
      </Box>
    );
  } else if (debounced.length >= 2 && results.length === 0) {
    searchResultsSection = (
      <Typography sx={{ mt: 3, color: 'text.secondary' }}>
        {t('findFriendsPage.empty')}
      </Typography>
    );
  } else {
    searchResultsSection = (
      <List sx={{ mt: 1 }}>
        {results.map(u => {
          const isSelf = authUser && u.id === authUser.id;
          return (
            <ListItem
              key={u.id}
              secondaryAction={
                <Box
                  sx={{
                    display: 'flex',
                    gap: 1,
                    flexWrap: 'wrap',
                    justifyContent: 'flex-end',
                  }}
                >
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      onClose();
                      navigate(`/u/${encodeURIComponent(u.pseudo)}`);
                    }}
                  >
                    {t('findFriendsPage.openProfile')}
                  </Button>
                  {isSelf ? null : (
                    <Button
                      size="small"
                      variant="contained"
                      disabled={invitingId === u.id}
                      onClick={() => {
                        handleInvite(u).catch(() => {});
                      }}
                    >
                      {invitingId === u.id ? (
                        <CircularProgress size={18} color="inherit" />
                      ) : (
                        t('friendsPage.invite')
                      )}
                    </Button>
                  )}
                </Box>
              }
              sx={{
                borderRadius: 1,
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <ListItemAvatar>
                <Avatar src={u.avatar_url || undefined}>
                  {u.pseudo[0]?.toUpperCase()}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Typography
                    component={Link}
                    to={`/u/${encodeURIComponent(u.pseudo)}`}
                    fontWeight={600}
                    color="inherit"
                    onClick={onClose}
                    sx={{
                      textDecoration: 'none',
                      '&:hover': { textDecoration: 'underline' },
                    }}
                  >
                    {u.pseudo}
                  </Typography>
                }
              />
            </ListItem>
          );
        })}
      </List>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <DialogTitle
        sx={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 700 }}
      >
        {t('friendsPage.addFriendModalTitle')}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('findFriendsPage.hint')}
        </Typography>
        <TextField
          fullWidth
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={t('findFriendsPage.placeholder')}
          InputProps={{
            startAdornment: (
              <PersonSearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
            ),
          }}
          autoComplete="off"
        />
        {debounced.length > 0 && debounced.length < 2 ? (
          <Typography sx={{ mt: 2, color: 'text.secondary', fontSize: 14 }}>
            {t('findFriendsPage.minChars')}
          </Typography>
        ) : null}
        {searchResultsSection}
      </DialogContent>
    </Dialog>
  );
}
