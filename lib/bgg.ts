// lib/bgg.ts
// Recherche et import de jeux depuis l'API publique BoardGameGeek (XML).
// BoardGameGeek bloque les requêtes directes hors navigateur (401), donc on
// passe par un relais qui récupère la page côté serveur.

import { type Jeu } from "@/data/jeux";

export type BggResultat = { id: string; nom: string; annee?: string };

type Relais = { url: (u: string) => string; json?: boolean };

const RELAIS: Relais[] = [
  { url: (u) => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`, json: true },
  { url: (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}` },
  { url: (u) => `https://thingproxy.freeboard.io/fetch/${u}` },
  { url: (u) => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(u)}` },
];

async function recupererXml(bggUrl: string): Promise<string> {
  let derniereErreur = "réseau indisponible";
  for (const relais of RELAIS) {
    try {
      const res = await fetch(relais.url(bggUrl), { headers: { Accept: "*/*" } });
      if (!res.ok) {
        derniereErreur = `relais ${res.status}`;
        continue;
      }
      let texte = await res.text();
      if (relais.json) {
        try {
          texte = JSON.parse(texte).contents ?? "";
        } catch {
          texte = "";
        }
      }
      if (texte.includes("<items")) return texte;
      derniereErreur = "réponse inattendue";
    } catch (e) {
      derniereErreur = e instanceof Error ? e.message : String(e);
    }
  }
  throw new Error(`Impossible de joindre BoardGameGeek (${derniereErreur}).`);
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
  const url = `https://boardgamegeek.com/xmlapi2/search?type=boardgame&query=${encodeURIComponent(query)}`;
  const xml = await recupererXml(url);
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
  const url = `https://boardgamegeek.com/xmlapi2/thing?id=${id}`;
  const xml = await recupererXml(url);

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
  };
}
