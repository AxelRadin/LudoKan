export type AdminEntityPick = { id: number; label: string };

export type AdminReviewUser = {
  id: number;
  pseudo?: string;
  email?: string;
};

export type AdminReviewGame = {
  id: number;
  name?: string;
};

export type AdminReviewRating = {
  value: number;
} | null;

export type AdminReviewRow = {
  id: number;
  user: AdminReviewUser;
  game: AdminReviewGame;
  rating: AdminReviewRating;
  title: string;
  content: string;
  date_created: string;
  date_modified: string;
};

export type AdminRatingRow = {
  id: number;
  game: number;
  game_name: string;
  user: number;
  user_pseudo: string;
  rating_type: string;
  value: number;
};
