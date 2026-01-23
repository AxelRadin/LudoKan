export type IgdbPlatform = {
  id: number;
  name: string;
};

export type IgdbCover = {
  id: number;
  url: string;
};

export type IgdbGameLocalization = {
  id: number;
  name: string;
  region?: { id: number; name: string };
};

export type IgdbCollection = {
  id: number;
  name: string;
};

export type IgdbFranchise = {
  id: number;
  name: string;
};

export type IgdbGame = {
  id: number;

  // IGDB
  name: string;
  summary?: string;
  first_release_date?: number;
  cover?: IgdbCover;
  platforms?: IgdbPlatform[];

  // IGDB (optionnel)
  game_localizations?: IgdbGameLocalization[];

  // ✅ "Voir plus"
  franchises?: IgdbFranchise[];
  collections?: IgdbCollection[];

  // 🔥 Enrichissement backend (Wikidata)
  display_name?: string;
  name_fr?: string | null;
  name_en?: string;
};



const BACKEND_URL = "http://localhost:3001";

export async function fetchIgdbGames(): Promise<IgdbGame[]> {
  const res = await fetch(`${BACKEND_URL}/api/games`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

// Petit helper pour l'URL d'image
export function getCoverUrl(cover?: IgdbCover): string | null {
  if (!cover?.url) return null;
  // l'API renvoie //images.igdb.com/... → on préfixe
  if (cover.url.startsWith("//")) {
    return `https:${cover.url}`.replace("t_thumb", "t_cover_big");

  }
  return cover.url;
}

// Helper pour la date
export function formatReleaseDate(ts?: number): string | null {
  if (!ts) return null;
  const date = new Date(ts * 1000); // secondes → ms
  return date.toLocaleDateString();
}

export async function searchIgdbGames(q: string, limit = 8, suggest = false): Promise<IgdbGame[]> {
  const res = await fetch(
    `${BACKEND_URL}/api/search?q=${encodeURIComponent(q)}&limit=${limit}&suggest=${suggest ? 1 : 0}`
  );

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`API error ${res.status} ${txt}`);
  }

  return res.json();
}

export type IgdbAlternativeName = {
  name: string;
  language?: string;
};

export async function fetchFranchiseGames(franchiseId: number, limit = 50, offset = 0): Promise<IgdbGame[]> {
  const res = await fetch(`${BACKEND_URL}/api/franchise/${franchiseId}/games?limit=${limit}&offset=${offset}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}


