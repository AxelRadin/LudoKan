export type AdminStats = {
  users: {
    total: number;
    new_last_7_days: number;
    suspended: number;
  };
  games: {
    total_published: number;
  };
  reviews: {
    total: number;
    published_this_month: number;
    reported_unresolved: number;
  };
  tickets: {
    pending: number;
    reviewing: number;
    total: number;
  };
  moderation: {
    reports_total: number;
    reports_resolved: number;
    rate: number;
  };
  recent_activity: {
    latest_tickets: {
      id: number;
      game_name: string;
      submitted_by: string;
      created_at: string;
      status: string;
    }[];
    latest_reports: {
      id: number;
      review_excerpt: string;
      reported_by: string;
      created_at: string;
    }[];
  };
};
