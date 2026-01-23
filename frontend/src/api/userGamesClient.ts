// frontend/src/api/userGamesClient.ts
import backendClient from "./backendClient";

export type UserGameStatus = "playing" | "finished" | "abandoned" | "wishlist";

export type UserGame = {
  id: number;
  igdb_game_id: number;
  status: UserGameStatus;
  hours_played?: number | null;
  created_at: string;
  updated_at: string;
};

export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export async function fetchUserGames(): Promise<UserGame[]> {
  const data = (await backendClient.get(
    "/library/user/games/"
  )) as PaginatedResponse<UserGame>;

  return data.results;
}

export function addUserGame(
  igdbGameId: number,
  status: UserGameStatus = "playing",
  hoursPlayed?: number
): Promise<UserGame> {
  return backendClient.post("/library/user/games/", {
    igdb_game_id: igdbGameId,
    status,
    hours_played: hoursPlayed,
  }) as Promise<UserGame>;
}

export function updateUserGame(
  id: number,
  data: Partial<Pick<UserGame, "status" | "hours_played">>
): Promise<UserGame> {
  return backendClient.patch(`/library/user/games/${id}/`, data) as Promise<UserGame>;
}

export function deleteUserGame(id: number): Promise<{}> {
  return backendClient.delete(`/library/user/games/${id}/`) as Promise<{}>;
}
