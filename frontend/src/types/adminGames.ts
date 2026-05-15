export type AdminGamePublisher = {
  id: number;
  name: string;
};

export type AdminGameGenre = { id: number; name: string };
export type AdminGamePlatform = { id: number; name: string };

export type AdminGameListItem = {
  id: number;
  name: string;
  summary?: string;
  status?: string;
  average_rating?: number;
  publisher?: AdminGamePublisher | null;
};

export type AdminGameDetail = {
  id: number;
  igdb_id: number | null;
  name: string;
  name_fr: string;
  description: string;
  cover_url: string | null;
  release_date: string | null;
  status: string;
  min_players: number | null;
  max_players: number | null;
  min_age: number | null;
  publisher: AdminGamePublisher;
  genres: AdminGameGenre[];
  platforms: AdminGamePlatform[];
  average_rating: number;
  rating_count: number;
  created_at: string;
  updated_at: string;
};
