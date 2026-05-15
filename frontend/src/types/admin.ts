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
    action: string;
    actor: string | null;
    target: string | null;
    time: string;
  }[];
};
