// backend/src/server.ts
import express, { Request, Response } from "express";
import cors from "cors";
import axios, { AxiosError } from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const TWITCH_CLIENT_ID = process.env.TWITCH_CLIENT_ID;
const TWITCH_CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
const IGDB_BASE_URL = process.env.IGDB_BASE_URL ?? "https://api.igdb.com/v4";

// ✅ On vérifie à froid pour éviter les undefined plus tard
if (!TWITCH_CLIENT_ID || !TWITCH_CLIENT_SECRET) {
  console.error("❌ TWITCH_CLIENT_ID ou TWITCH_CLIENT_SECRET manquant dans .env");
  process.exit(1);
}

// 🔑 Token avec typage correct
let accessToken: string | null = null;
let accessTokenExpiresAt: number = 0;

// ======================================================
// ⚡ Fonction pour obtenir/renouveler un token Twitch
// ======================================================
async function getAccessToken(): Promise<string> {
  const now = Date.now();

  // Token encore valide → on le réutilise
  if (accessToken && now < accessTokenExpiresAt - 60_000) {
    return accessToken;
  }

  // ⚠️ Ici on utilise "!" car on a déjà vérifié au-dessus que ce n’est pas undefined
  const bodyParams: Record<string, string> = {
    client_id: TWITCH_CLIENT_ID!,
    client_secret: TWITCH_CLIENT_SECRET!,
    grant_type: "client_credentials",
  };

  const res = await axios.post(
    "https://id.twitch.tv/oauth2/token",
    new URLSearchParams(bodyParams)
  );

  const data = res.data as {
    access_token: string;
    expires_in: number;
  };

  accessToken = data.access_token;
  accessTokenExpiresAt = now + data.expires_in * 1000;

  console.log("🔑 Nouveau token Twitch obtenu !");
  return accessToken;
}

// ======================================================
// 🎮 Route IGDB : récupérer quelques jeux
// ======================================================
app.get("/api/games", async (_req: Request, res: Response) => {
  try {
    const token = await getAccessToken();

    const query = `
      fields name, cover.url, first_release_date, summary, platforms.name;
      sort first_release_date desc;
      limit 10;
    `;

    const igdbRes = await axios.post(
      `${IGDB_BASE_URL}/games`,
      query,
      {
        headers: {
          "Client-ID": TWITCH_CLIENT_ID!,
          Authorization: `Bearer ${token}`,
          "Content-Type": "text/plain",
        },
      }
    );

    res.json(igdbRes.data);
  } catch (error: unknown) {
    const err = error as AxiosError;
    console.error("❌ Erreur IGDB :", err.response?.data ?? err.message);

    res.status(500).json({
      error: "Erreur IGDB",
      details: err.response?.data ?? err.message,
    });
  }
});



// ======================================================
// 🎮 Route IGDB : rechercher des jeux
// ====================================================== 

function normalizeQuery(q: string) {
  return q.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function escapeIgdbString(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function tokenize(q: string): string[]{
  return q
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6);
}

// ======================================================
// 🔁 SYNONYMES FR → EN (Pokemon, titres connus, etc.)
// ======================================================

const TOKEN_SYNONYMS: Record<string, string[]> = {
  // Pokémon versions (FR -> EN)
  "emeraude": ["emerald"],
  "rubis": ["ruby"],
  "saphir": ["sapphire"],
  "rouge": ["red"],
  "bleu": ["blue"],
  "jaune": ["yellow"],
  "or": ["gold"],
  "argent": ["silver"],
  "cristal": ["crystal"],
  "diamant": ["diamond"],
  "perle": ["pearl"],
  "platine": ["platinum"],
  "noir": ["black"],
  "blanc": ["white"],
  "lune": ["moon"],
  "soleil": ["sun"],
  "ecarlate": ["scarlet"],
  "violet": ["violet"],
  "epee": ["sword"],
  "bouclier": ["shield"],

  // Noms généraux
  "pokemon": ["pokémon"],
  "pokémon": ["pokemon"],
};

function expandTokens(tokens: string[]): string[] {
  const out = new Set<string>();
  for (const t of tokens) {
    out.add(t);
    const syns = TOKEN_SYNONYMS[t];
    if (syns) syns.forEach((s) => out.add(s));
  }
  return Array.from(out);
}


function buildAndContains(field: string, tokens: string[]): string {
  return tokens.map((t) => `${field} ~ *"${escapeIgdbString(t)}"*`).join(" & ");
}

function buildLooseContains(field: string, tokens: string[]): string {
  return tokens
    .map((t) => `${field} ~ *"${escapeIgdbString(t)}"*`)
    .join(" | ");
}
function uniq(tokens: string[]): string[] {
  return Array.from(new Set(tokens.map((t) => t.trim()).filter(Boolean)));
}

function buildAnyContains(field: string, tokens: string[]): string {
  const u = uniq(tokens);
  return u.map((t) => `${field} ~ *"${escapeIgdbString(t)}"*`).join(" | ");
}

const STOPWORDS_FR = new Set([
  "le","la","les","un","une","des",
  "de","du","d","l","et","ou","a","au","aux",
  "en","dans","sur","pour","par","avec","sans",
  "the","of","and","or"
]);

function filterUsefulTokens(tokens: string[]): string[] {
  return tokens.filter((t) => {
    if (!t) return false;
    if (STOPWORDS_FR.has(t)) return false;
    if (t.length >= 4) return true;
    if (/^\d+$/.test(t)) return true;
    if (/^(i|ii|iii|iv|v|vi|vii|viii|ix|x)$/.test(t)) return true;
    return false;
  });
}

const GENERIC_TERMS = new Set([
  "professeur", "version", "edition", "ultimate", "deluxe", "collection"
]);

function pickMustToken(tokens: string[]): string | null {
  const candidates = tokens.filter((t) => !GENERIC_TERMS.has(t));
  const pool = candidates.length ? candidates : tokens;
  if (pool.length === 0) return null;
  return [...pool].sort((a, b) => b.length - a.length)[0] ?? null;
}

function joinOr(clauses: string[]): string {
  // enlève les vides et join avec |
  const clean = clauses.map((c) => c.trim()).filter(Boolean);
  return clean.join(" | ");
}

function pickTopTokens(tokens: string[], n: number): string[] {
  // prend les tokens les plus longs (souvent les plus discriminants)
  return [...tokens].sort((a, b) => b.length - a.length).slice(0, n);
}

function buildMin2Contains(field: string, tokens: string[]): string {
  // si on a 2+ tokens, on exige que les 2 meilleurs matchent (AND)
  const top2 = pickTopTokens(tokens, 2);
  if (top2.length < 2) {
    // pas assez de tokens -> on retombe sur loose
    return buildLooseContains(field, tokens);
  }
  return top2.map((t) => `${field} ~ *"${escapeIgdbString(t)}"*`).join(" & ");
}


// -------------------------
// WIKIDATA (CACHE + BATCH)
// -------------------------

type WdLabelMap = Record<string, string | null>;

const WIKIDATA_FR_CACHE = new Map<string, { value: string | null; ts: number }>();
const WIKIDATA_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 jours

function cacheGet(nameEn: string): string | null | undefined {
  const hit = WIKIDATA_FR_CACHE.get(nameEn);
  if (!hit) return undefined;
  if (Date.now() - hit.ts > WIKIDATA_TTL_MS) {
    WIKIDATA_FR_CACHE.delete(nameEn);
    return undefined;
  }
  return hit.value;
}

function cacheSet(nameEn: string, value: string | null) {
  WIKIDATA_FR_CACHE.set(nameEn, { value, ts: Date.now() });
}

// Batch SPARQL : labels FR depuis labels EN exacts
async function wikidataFrenchLabelsByEnglishTitles(namesEn: string[]): Promise<WdLabelMap> {
  const result: WdLabelMap = {};
  const unique = Array.from(new Set(namesEn.map((s) => s.trim()).filter(Boolean)));

  const toFetch: string[] = [];
  for (const n of unique) {
    const cached = cacheGet(n);
    if (cached !== undefined) result[n] = cached;
    else toFetch.push(n);
  }
  if (toFetch.length === 0) return result;

  const CHUNK = 15;

  for (let i = 0; i < toFetch.length; i += CHUNK) {
    const chunk = toFetch.slice(i, i + CHUNK);
    const values = chunk.map((t) => `"${t.replace(/"/g, '\\"')}"`).join(" ");

    const sparql = `
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
SELECT ?q ?frLabel WHERE {
  VALUES ?q { ${values} }

  ?item wdt:P31 wd:Q7889.

  OPTIONAL { ?item rdfs:label ?enLabel FILTER(LANG(?enLabel) = "en") }
  OPTIONAL { ?item skos:altLabel ?enAlt FILTER(LANG(?enAlt) = "en") }

  FILTER(
    (BOUND(?enLabel) && LCASE(STR(?enLabel)) = LCASE(STR(?q))) ||
    (BOUND(?enAlt)  && LCASE(STR(?enAlt))  = LCASE(STR(?q)))
  )

  OPTIONAL { ?item rdfs:label ?frLabel FILTER(LANG(?frLabel) = "fr") }
}
`.trim();

    const url =
      "https://query.wikidata.org/sparql?format=json&query=" +
      encodeURIComponent(sparql);

    const r = await fetch(url, {
      headers: {
        Accept: "application/sparql+json",
        "User-Agent": "LudoKan/1.0 (contact: dev@ludokan.local)",
      },
    });

    if (!r.ok) {
      for (const n of chunk) {
        result[n] = null;
        cacheSet(n, null);
      }
      continue;
    }

    const json: any = await r.json();
    const bindings: any[] = json?.results?.bindings ?? [];

    for (const n of chunk) result[n] = null;

    for (const b of bindings) {
      const q = b?.q?.value;
      const fr = b?.frLabel?.value ?? null;
      if (typeof q === "string") {
        result[q] = typeof fr === "string" && fr.trim() ? fr : null;
      }
    }

    for (const n of chunk) cacheSet(n, result[n] ?? null);
  }

  return result;
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), ms)
    ),
  ]);
}

async function enrichWithWikidataDisplayName(data: any[]): Promise<any[]> {
  const arr = Array.isArray(data) ? data : [];
  if (arr.length === 0) return [];

  const namesEn = arr.map((g: any) => String(g?.name ?? "")).filter(Boolean);

  let frMap: Record<string, string | null> = {};
  try {
    // ✅ Timeout 700ms : si Wikidata rame, on ne bloque pas tes suggestions
    frMap = await withTimeout(wikidataFrenchLabelsByEnglishTitles(namesEn), 2000);
  } catch {
    frMap = {};
  }

  return arr.map((g: any) => {
    const nameEn = String(g?.name ?? "");
    const nameFr = frMap[nameEn] ?? null;
    return {
      ...g,
      display_name: nameFr ?? nameEn,
      name_fr: nameFr,
      name_en: nameEn,
    };
  });
}


// -------------------------
// /api/search (IGDB + Wikidata display_name)
// -------------------------

app.get("/api/search", async (req: Request, res: Response) => {
  try {
    const raw = String(req.query.q ?? "");
    const q = raw.trim();
    if (!q) return res.status(400).json({ error: "Missing query param: q" });

    const suggest = String(req.query.suggest ?? "0") === "1";
    const limitRaw = Number(req.query.limit ?? 20);
    const limit = Math.min(Math.max(limitRaw, 1), 50);

    const token = await getAccessToken();

    const fields =
      "fields name,cover.url,first_release_date,summary,platforms.name,total_rating,total_rating_count," +
      "alternative_names.name," +
      "game_localizations.name,game_localizations.region.name," +
      "franchises.id,franchises.name,collections.id,collections.name;";

    const qEsc = escapeIgdbString(q);

    // ✅ Pour les suggestions : on récupère plus large puis on trie “popularité” nous-mêmes
    const fetchLimit = suggest ? Math.min(limit * 5, 50) : limit;

    const igdbQuery = `${fields} search "${qEsc}"; limit ${fetchLimit};`;

    let data = (
      await axios.post(`${IGDB_BASE_URL}/games`, igdbQuery, {
        headers: {
          "Client-ID": TWITCH_CLIENT_ID!,
          Authorization: `Bearer ${token}`,
          "Content-Type": "text/plain",
        },
      })
    ).data;

    // fallback sans accents si 0 résultats
    if (!Array.isArray(data) || data.length === 0) {
      const q2 = normalizeQuery(q);
      const igdbQuery2 = `${fields} search "${escapeIgdbString(q2)}"; limit ${fetchLimit};`;

      data = (
        await axios.post(`${IGDB_BASE_URL}/games`, igdbQuery2, {
          headers: {
            "Client-ID": TWITCH_CLIENT_ID!,
            Authorization: `Bearer ${token}`,
            "Content-Type": "text/plain",
          },
        })
      ).data;
    }

    let arr = Array.isArray(data) ? data : [];

    // ✅ Tri popularité pour suggestions (comme “Pokemon” -> jeux connus)
    if (suggest) {
      arr = arr
        .slice()
        .sort((a: any, b: any) => (b?.total_rating_count ?? 0) - (a?.total_rating_count ?? 0))
        .slice(0, limit);
    }

    const enriched = await enrichWithWikidataDisplayName(arr);
    return res.json(enriched);
  } catch (error: any) {
    const status = error?.response?.status ?? 500;
    const details = error?.response?.data ?? error?.message;
    console.error("❌ /api/search ERROR", status, details);
    return res.status(status).json({
      error: "Erreur IGDB search",
      details,
    });
  }
});

app.get("/api/collection/:id/games", async (req: Request<{ id: string }>, res: Response) => {
  try {
    const collectionId = Number(req.params.id);
    if (!Number.isFinite(collectionId)) {
      return res.status(400).json({ error: "Invalid collection id" });
    }

    const limitRaw = Number(req.query.limit ?? 50);
    const limit = Math.min(Math.max(limitRaw, 1), 200);

    const offsetRaw = Number(req.query.offset ?? 0);
    const offset = Math.max(offsetRaw, 0);

    const token = await getAccessToken();

    const query = `
      fields name,cover.url,first_release_date,summary,platforms.name,total_rating,total_rating_count,
             collections.id,collections.name;
      where collections = (${collectionId});
      sort total_rating_count desc;
      limit ${limit};
      offset ${offset};
    `;

    const igdbRes = await axios.post(`${IGDB_BASE_URL}/games`, query, {
      headers: {
        "Client-ID": TWITCH_CLIENT_ID!,
        Authorization: `Bearer ${token}`,
        "Content-Type": "text/plain",
      },
    });

    return res.json(Array.isArray(igdbRes.data) ? igdbRes.data : []);
  } catch (error: any) {
    const status = error?.response?.status ?? 500;
    const details = error?.response?.data ?? error?.message;
    console.error("❌ /api/collection/:id/games ERROR", status, details);
    return res.status(status).json({ error: "Erreur IGDB collection", details });
  }
});



// -------------------------
// DEBUG : test Wikidata par nom EN
// -------------------------



async function wikidataFrenchLabelByEnglishTitle(nameEn: string): Promise<string | null> {
  const sparql = `
SELECT ?item ?frLabel WHERE {
  ?item wdt:P31 wd:Q7889;
        rdfs:label "${nameEn.replace(/"/g, '\\"')}"@en.
  OPTIONAL { ?item rdfs:label ?frLabel FILTER(LANG(?frLabel) = "fr") }
}
LIMIT 1
`.trim();

  const url =
    "https://query.wikidata.org/sparql?format=json&query=" +
    encodeURIComponent(sparql);

  const r = await fetch(url, {
    headers: {
      Accept: "application/sparql+json",
      "User-Agent": "LudoKan-Test/1.0 (contact: dev@ludokan.local)",
    },
  });

  if (!r.ok) return null;

  const json: any = await r.json();
  const bindings = json?.results?.bindings ?? [];
  const fr = bindings[0]?.frLabel?.value;
  return typeof fr === "string" && fr.trim() ? fr : null;
}

app.get("/api/wikidata-test", async (req, res) => {
  const nameEn = String(req.query.nameEn ?? "").trim();
  if (!nameEn) return res.status(400).json({ error: "Missing query param: nameEn" });

  try {
    const fr = await wikidataFrenchLabelByEnglishTitle(nameEn);
    return res.json({
      name_en: nameEn,
      name_fr: fr,
    });
  } catch (e: any) {
    return res.status(500).json({ error: "wikidata test failed", details: e?.message ?? String(e) });
  }
});

app.get("api/franchise/:id/games", async (req, res) => {
  try{
    const franchiseId = Number(req.params.id);
    if (!Number.isFinite(franchiseId)) {
      return res.status(400).json({error: "Invalid franchise id"});
    }

    const limitRaw = Number(req.query.limit ?? 50);
    const limit = Math.min(Math.max(limitRaw, 1), 200);

    const offsetRaw = Number(req.query.offset ?? 0);
    const offset = Math.max(offsetRaw, 0);

    const token = await getAccessToken();

    const query = `
    fields name,cover.url,first_release_date,summary,platforms.name,total_rating,total_rating_count,franchises.id,franchises.name;
      where franchises = (${franchiseId});
      sort total_rating_count desc;
      limit ${limit};
      offset ${offset};
    `;

    const igdbRes = await axios.post(`${IGDB_BASE_URL}/games`, query, {
      headers: {
        "Client-ID": TWITCH_CLIENT_ID!,
        Authorization: `Bearer ${token}`,
        "Content-Type": "text/plain",
      },
    });

    return res.json(Array.isArray(igdbRes.data) ? igdbRes.data : []);
  } catch (error: any) {
    console.error("❌ Erreur IGDB franchise:", error.response?.data ?? error.message);
    return res.status(500).json({
      error: "Erreur IGDB franchise",
      details: error.response?.data ?? error.message,
    });
  }
})

const PORT = Number(process.env.PORT) || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Backend IGDB lancé sur http://localhost:${PORT}`);
});










