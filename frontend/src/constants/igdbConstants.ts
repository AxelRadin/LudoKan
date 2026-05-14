export type IgdbCategory = {
  id: number;
  name: string;
};

export const IGDB_GENRES: IgdbCategory[] = [
  { id: 4, name: 'Action' },
  { id: 31, name: 'Adventure' },
  { id: 12, name: 'RPG' },
  { id: 5, name: 'FPS' },
  { id: 24, name: 'TPS' },
  { id: 15, name: 'Strategy' },
  { id: 13, name: 'Simulation' },
  { id: 9, name: 'Puzzle' },
  { id: 10, name: 'Racing' },
  { id: 14, name: 'Sport' },
  { id: 25, name: "Hack'n Slash" },
  { id: 8, name: 'Platform' },
  { id: 35, name: 'Card & Board' },
];

export const IGDB_PLATFORMS: IgdbCategory[] = [
  { id: 6, name: 'PC' },
  { id: 167, name: 'PS5' },
  { id: 48, name: 'PS4' },
  { id: 169, name: 'Xbox Series X|S' },
  { id: 49, name: 'Xbox One' },
  { id: 130, name: 'Nintendo Switch' },
  { id: 39, name: 'iOS' },
  { id: 34, name: 'Android' },
];

export const IGDB_THEMES: IgdbCategory[] = [
  { id: 1, name: 'Action' },
  { id: 19, name: 'Horror' },
  { id: 20, name: 'Fantasy' },
  { id: 18, name: 'Sci-fi' },
  { id: 38, name: 'Open World' },
  { id: 21, name: 'Survival' },
  { id: 23, name: 'Stealth' },
  { id: 27, name: 'Comedy' },
  { id: 33, name: 'Sandbox' },
  { id: 22, name: 'Historical' },
  { id: 39, name: 'Warfare' },
  { id: 32, name: 'Non-fiction' },
  { id: 43, name: 'Mystery' },
];

export const IGDB_GAME_MODES: IgdbCategory[] = [
  { id: 1, name: 'Single player' },
  { id: 2, name: 'Multiplayer' },
  { id: 3, name: 'Co-operative' },
  { id: 4, name: 'Split screen' },
  { id: 5, name: 'MMO' },
  { id: 6, name: 'Battle Royale' },
];

export const IGDB_PLAYER_PERSPECTIVES: IgdbCategory[] = [
  { id: 1, name: 'First person' },
  { id: 2, name: 'Third person' },
  { id: 3, name: "Bird's eye / Top-down" },
  { id: 4, name: 'Side view' },
  { id: 7, name: 'Virtual Reality' },
];
