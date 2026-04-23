export type AdminRole = 'moderator' | 'admin' | 'superadmin';

export type AdminStats = {
  totals: {
    users: number;
    games: number;
    tickets: number;
    reviews: number;
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
    user: string;
    created_at: string;
  }[];
};
