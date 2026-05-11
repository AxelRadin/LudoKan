import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import {
  Avatar,
  Box,
  CircularProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  TextField,
  Typography,
  Button,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import PageLayout from '../components/PageLayout';
import { searchUsersForFriends, type UserSearchHit } from '../api/social';
import { useAuth } from '../contexts/useAuth';

export default function FindFriendsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [results, setResults] = useState<UserSearchHit[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const tmr = window.setTimeout(() => setDebounced(query.trim()), 350);
    return () => window.clearTimeout(tmr);
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
    if (!isAuthenticated) {
      setResults([]);
      return;
    }
    runSearch(debounced).catch(() => {});
  }, [debounced, isAuthenticated, runSearch]);

  if (!isAuthenticated) {
    return (
      <PageLayout title={t('findFriendsPage.title')} backTo="/">
        <Typography>{t('findFriendsPage.loginRequired')}</Typography>
      </PageLayout>
    );
  }

  return (
    <PageLayout title={t('findFriendsPage.title')} backTo="/profile">
      <Box sx={{ maxWidth: 560 }}>
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
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={32} />
          </Box>
        ) : debounced.length >= 2 && results.length === 0 ? (
          <Typography sx={{ mt: 3, color: 'text.secondary' }}>
            {t('findFriendsPage.empty')}
          </Typography>
        ) : (
          <List sx={{ mt: 1 }}>
            {results.map(u => (
              <ListItem
                key={u.id}
                secondaryAction={
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() =>
                      navigate(`/u/${encodeURIComponent(u.pseudo)}`)
                    }
                  >
                    {t('findFriendsPage.openProfile')}
                  </Button>
                }
                sx={{ borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}
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
            ))}
          </List>
        )}
      </Box>
    </PageLayout>
  );
}
