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
    action: string | null;
    actor: string | null;
    target: string | null;
    time: string;
  }[];
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
