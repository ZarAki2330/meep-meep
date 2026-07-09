// lib/bgg.ts
// Recherche et import de jeux depuis l'API XML de BoardGameGeek.
//
// Depuis juillet 2025, BGG exige une inscription et un jeton Bearer.
// 1. Enregistre une application (non commerciale, gratuite) sur
//    https://boardgamegeek.com/applications
// 2. Génère un jeton, puis place-le dans un fichier .env.local à la racine :
//    EXPO_PUBLIC_BGG_TOKEN=ton-jeton-ici
// 3. Relance Expo (npx expo start -c).

import { type Jeu } from "@/data/jeux";

export type BggResultat = { id: string; nom: string; annee?: string };

const JETON = process.env.EXPO_PUBLIC_BGG_TOKEN ?? "";

export function jetonConfigure() {
  return JETON.trim().length > 0;
}

// Attention : le domaine doit être boardgamegeek.com, sans "www".
const BASE = "https://boardgamegeek.com/xmlapi2";

async function recupererXml(url: string): Promise<string> {
  if (!jetonConfigure()) {
    throw new Error(
      "Aucun jeton BoardGameGeek configuré. Ajoute EXPO_PUBLIC_BGG_TOKEN dans .env.local.",
    );
  }
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${JETON}`,
      Accept: "application/xml, text/xml, */*",
    },
  });
  if (res.status === 401 || res.status === 403) {
    throw new Error("Jeton refusé par BoardGameGeek. Vérifie qu'il est valide et approuvé.");
  }
  if (res.status === 429) {
    throw new Error("Trop de requêtes vers BoardGameGeek. Réessaie dans un instant.");
  }
  if (!res.ok) {
    throw new Error(`BoardGameGeek a répondu ${res.status}.`);
  }
  return res.text();
}

function decoder(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&rsquo;/g, "’")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&#10;/g, "\n")
    .replace(/&#13;/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
}

function nettoyer(s: string): string {
  return decoder(s)
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function tronquer(s: string, n: number): string {
  return s.length > n ? s.slice(0, n).trim() + "…" : s;
}

function nombre(v: string | undefined, defaut: number): number {
  const n = parseInt(v ?? "", 10);
  return isNaN(n) ? defaut : n;
}

export async function rechercherBgg(query: string): Promise<BggResultat[]> {
  const xml = await recupererXml(
    `${BASE}/search?type=boardgame&query=${encodeURIComponent(query)}`,
  );
  const items = [...xml.matchAll(/<item[^>]*\bid="(\d+)"[\s\S]*?<\/item>/g)];
  const resultats: BggResultat[] = items.map((m) => {
    const bloc = m[0];
    const nom = /<name[^>]*value="([^"]*)"/.exec(bloc)?.[1] ?? "Sans nom";
    const annee = /<yearpublished[^>]*value="([^"]*)"/.exec(bloc)?.[1];
    return { id: m[1], nom: decoder(nom), annee };
  });
  const vus = new Set<string>();
  return resultats.filter((r) => (vus.has(r.id) ? false : (vus.add(r.id), true))).slice(0, 25);
}

export async function importerDepuisBgg(id: string): Promise<Jeu> {
  const xml = await recupererXml(`${BASE}/thing?id=${id}`);

  const nom = /<name[^>]*type="primary"[^>]*value="([^"]*)"/.exec(xml)?.[1] ?? "Jeu importé";
  const image = /<image>([\s\S]*?)<\/image>/.exec(xml)?.[1]?.trim() ?? "";
  const minp = nombre(/<minplayers[^>]*value="(\d+)"/.exec(xml)?.[1], 1);
  const maxp = nombre(/<maxplayers[^>]*value="(\d+)"/.exec(xml)?.[1], minp);
  const temps = nombre(/<playingtime[^>]*value="(\d+)"/.exec(xml)?.[1], 0);
  const age = nombre(/<minage[^>]*value="(\d+)"/.exec(xml)?.[1], 0);
  const descBrut = /<description>([\s\S]*?)<\/description>/.exec(xml)?.[1] ?? "";
  const desc = nettoyer(descBrut);

  return {
    id: `bgg${id}`,
    nom: decoder(nom),
    description: desc ? tronquer(desc, 160) : "Jeu importé depuis BoardGameGeek.",
    joueursMin: minp,
    joueursMax: Math.max(maxp, minp),
    dureeMin: temps,
    ageMin: age,
    categorie: "Importé",
    image,
    regles: desc ? [tronquer(desc, 600)] : [],
    scoreVictoire: "max",
    scoreMode: "compteur",
  };
}
