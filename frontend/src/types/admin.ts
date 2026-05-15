export type AdminRole = 'moderator' | 'admin' | 'superadmin';

export type AdminUser = {
  id: number;
  pseudo?: string;
  username?: string;
  email: string;
  is_superuser: boolean;
  is_active: boolean;
  roles: string[];
  created_at?: string;
};

export type AdminStatsCharts = {
  users_daily: {
    date: string;
    new_users: number;
    active_logins: number;
  }[];
  games_top: { id: number; name: string; reviews: number }[];
  genres_share: { name: string; count: number }[];
};

export type AdminStats = {
  totals: {
    users: number;
    users_new_last_7_days: number;
    games: number;
    support_tickets: number;
    support_tickets_open: number;
    reviews: number;
    reports_unresolved: number;
  };
  engagement: {
    active_day: number;
    active_week: number;
    active_month: number;
    reviews_last_30d: number;
    ratings_last_30d: number;
    messages_last_30d: number;
  };
  recent_activity: {
    id: number;
    action: string | null;
    actor: string | null;
    target: string | null;
    time: string;
  }[];
  charts: AdminStatsCharts;
};

export type AdminActionRow = {
  id: number;
  timestamp: string;
  admin_user: number | null;
  admin_user_email: string | null;
  admin_user_pseudo: string | null;
  action_type: string;
  target_type: string;
  target_id: number | null;
  description: string;
};

export type AdminActionListResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: AdminActionRow[];
};
