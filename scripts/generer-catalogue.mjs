// scripts/generer-catalogue.mjs
// Génère / enrichit catalogue.json à partir de l'API XML de BoardGameGeek.
//
// C'est un outil de développement (Node), PAS du code embarqué dans l'app.
//
// Usage :
//   node scripts/generer-catalogue.mjs            (depuis scripts/bgg-ids.txt)
//   node scripts/generer-catalogue.mjs --hot      (ajoute la liste « Hot » de BGG)
//
// - Lit scripts/bgg-ids.txt : une entrée par ligne, « # » = commentaire.
//   Chaque ligne peut être :
//     * un identifiant BGG numérique (ex. 266192), ou
//     * un NOM de jeu (ex. Wingspan) — résolu en id via la recherche BGG.
// - Pour chaque jeu ABSENT de catalogue.json, récupère les infos depuis BGG et
//   crée une entrée « coquille » (nom, image, joueurs, durée, âge, description).
// - Les entrées DÉJÀ présentes sont laissées intactes : tes ajouts manuels
//   (règles, rôles, mode de score…) ne sont jamais écrasés. Pour rafraîchir un
//   jeu, retire-le de catalogue.json puis relance le script.
//
// Le jeton est lu depuis BGG_TOKEN ou EXPO_PUBLIC_BGG_TOKEN, ou à défaut depuis
// le fichier .env.local à la racine du projet.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ICI = dirname(fileURLToPath(import.meta.url));
const RACINE = join(ICI, "..");
const FICHIER_IDS = join(ICI, "bgg-ids.txt");
const FICHIER_CATALOGUE = join(RACINE, "catalogue.json");
const BASE = "https://boardgamegeek.com/xmlapi2";
const LOT = 20; // BGG accepte plusieurs id d'un coup : moins de requêtes.

// ——— Jeton ———

function chargerToken() {
  const direct = process.env.BGG_TOKEN || process.env.EXPO_PUBLIC_BGG_TOKEN;
  if (direct) return direct.trim();
  const env = join(RACINE, ".env.local");
  if (existsSync(env)) {
    for (const ligne of readFileSync(env, "utf8").split("\n")) {
      const m = /^\s*(?:EXPO_PUBLIC_)?BGG_TOKEN\s*=\s*(.+?)\s*$/.exec(ligne);
      if (m) return m[1].replace(/^["']|["']$/g, "").trim();
    }
  }
  return "";
}

const JETON = chargerToken();
if (!JETON) {
  console.error(
    "Aucun jeton BGG trouvé. Renseigne EXPO_PUBLIC_BGG_TOKEN dans .env.local (racine du projet).",
  );
  process.exit(1);
}

// ——— Petits utilitaires (repris de lib/bgg.ts) ———

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

function decoder(s) {
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

function nettoyer(s) {
  return decoder(s)
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const tronquer = (s, n) => (s.length > n ? s.slice(0, n).trim() + "…" : s);

function nombre(v, defaut) {
  const n = parseInt(v ?? "", 10);
  return isNaN(n) ? defaut : n;
}

// ——— Récupération BGG ———

async function recupererXml(url, essais = 6) {
  for (let i = 0; i < essais; i++) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${JETON}`, Accept: "application/xml, text/xml, */*" },
    });
    if (res.status === 202) {
      // BGG a mis la requête en file d'attente : on patiente puis on réessaie.
      await dormir(2500);
      continue;
    }
    if (res.status === 429) {
      await dormir(5000);
      continue;
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error("Jeton BGG refusé (401/403). Vérifie qu'il est valide et approuvé.");
    }
    if (!res.ok) throw new Error(`BGG a répondu ${res.status}.`);
    return res.text();
  }
  throw new Error("BGG n'a pas fini de préparer la réponse (202) après plusieurs essais.");
}

/** Résout une entrée (id numérique OU nom) en identifiant BGG. Pour un nom, on
 *  privilégie la correspondance exacte du nom, sinon le premier résultat. */
async function resoudreId(entree) {
  if (/^\d+$/.test(entree)) return entree;
  const xml = await recupererXml(`${BASE}/search?type=boardgame&query=${encodeURIComponent(entree)}`);
  const items = [...xml.matchAll(/<item[^>]*\bid="(\d+)"[\s\S]*?<\/item>/g)].map((m) => ({
    id: m[1],
    nom: decoder(/<name[^>]*value="([^"]*)"/.exec(m[0])?.[1] ?? ""),
    annee: /<yearpublished[^>]*value="([^"]*)"/.exec(m[0])?.[1] ?? "",
  }));
  if (!items.length) {
    console.warn(`  ! aucun résultat BGG pour « ${entree} »`);
    return null;
  }
  const cible = entree.trim().toLowerCase();
  const choisi = items.find((r) => r.nom.trim().toLowerCase() === cible) ?? items[0];
  console.log(`  « ${entree} » → ${choisi.id} (${choisi.nom}${choisi.annee ? `, ${choisi.annee}` : ""})`);
  return choisi.id;
}

/** Un bloc <item> BGG → une entrée « coquille » au format Jeu. Les champs que
 *  BGG ne fournit pas (règles, rôles, mode de score) sont à compléter à la main. */
function itemVersJeu(bloc, id) {
  const nom = /<name[^>]*type="primary"[^>]*value="([^"]*)"/.exec(bloc)?.[1] ?? "Jeu importé";
  const image = /<image>([\s\S]*?)<\/image>/.exec(bloc)?.[1]?.trim() ?? "";
  const minp = nombre(/<minplayers[^>]*value="(\d+)"/.exec(bloc)?.[1], 1);
  const maxp = nombre(/<maxplayers[^>]*value="(\d+)"/.exec(bloc)?.[1], minp);
  const temps = nombre(/<playingtime[^>]*value="(\d+)"/.exec(bloc)?.[1], 0);
  const age = nombre(/<minage[^>]*value="(\d+)"/.exec(bloc)?.[1], 0);
  const descBrut = /<description>([\s\S]*?)<\/description>/.exec(bloc)?.[1] ?? "";
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
    regles: [],
    scoreVictoire: "max",
    scoreMode: "compteur",
  };
}

/** La liste « Hot » de BGG : les ~50 jeux les plus en vogue du moment (réels,
 *  fournis par BGG). Sert de signal de popularité, actualisable à volonté. */
async function listeHot() {
  const xml = await recupererXml(`${BASE}/hot?type=boardgame`);
  const ids = [...xml.matchAll(/<item[^>]*\bid="(\d+)"/g)].map((m) => m[1]);
  console.log(`Liste « Hot » BGG : ${ids.length} jeux du moment.`);
  return ids;
}

async function recupererJeux(ids) {
  const jeux = [];
  for (let i = 0; i < ids.length; i += LOT) {
    const tranche = ids.slice(i, i + LOT);
    console.log(`  ↓ détails : ${tranche.join(", ")}`);
    const xml = await recupererXml(`${BASE}/thing?id=${tranche.join(",")}`);
    for (const id of tranche) {
      const m = new RegExp(`<item[^>]*\\bid="${id}"[\\s\\S]*?<\\/item>`).exec(xml);
      if (m) jeux.push(itemVersJeu(m[0], id));
      else console.warn(`  ! id ${id} introuvable dans la réponse BGG`);
    }
    if (i + LOT < ids.length) await dormir(1500); // rester poli entre deux lots
  }
  return jeux;
}

// ——— Programme ———

const AVEC_HOT = process.argv.includes("--hot");

const entrees = existsSync(FICHIER_IDS)
  ? readFileSync(FICHIER_IDS, "utf8")
      .split("\n")
      .map((l) => l.replace(/#.*/, "").trim())
      .filter(Boolean)
  : [];

// Option --hot : ajoute les jeux du moment (liste « Hot » de BGG).
if (AVEC_HOT) entrees.push(...(await listeHot()));

if (!entrees.length) {
  console.error(`Rien à faire : ${FICHIER_IDS} est vide et l'option --hot n'a pas été utilisée.`);
  process.exit(1);
}

console.log(`${entrees.length} entrée(s). Résolution des identifiants…`);
const ids = [];
for (const entree of entrees) {
  const id = await resoudreId(entree);
  if (id && !ids.includes(id)) ids.push(id);
  if (!/^\d+$/.test(entree)) await dormir(1200); // pause après chaque recherche
}

const catalogue = existsSync(FICHIER_CATALOGUE)
  ? JSON.parse(readFileSync(FICHIER_CATALOGUE, "utf8"))
  : [];
const dejaLa = new Set(catalogue.map((j) => j.id));

const aRecuperer = ids.filter((id) => !dejaLa.has(`bgg${id}`));
console.log(`\n${ids.length} jeu(x) identifié(s), ${aRecuperer.length} nouveau(x) à récupérer.`);

if (aRecuperer.length) {
  const nouveaux = await recupererJeux(aRecuperer);
  catalogue.push(...nouveaux);
  catalogue.sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  writeFileSync(FICHIER_CATALOGUE, JSON.stringify(catalogue, null, 2) + "\n");
  console.log(`\ncatalogue.json : ${catalogue.length} jeux (${nouveaux.length} ajouté(s)).`);
  console.log("À compléter à la main dans catalogue.json : règles, rôles, mode de score, catégorie.");
} else {
  console.log("Rien à ajouter : tous ces jeux sont déjà dans catalogue.json.");
}
