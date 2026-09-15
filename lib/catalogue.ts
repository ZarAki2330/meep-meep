// lib/catalogue.ts
// Catalogue de jeux « tout prêt » distant : permet d'enrichir la bibliothèque
// sans republier l'application. C'est un simple fichier JSON servi en statique
// (ici depuis GitHub). Il est téléchargé, mis en cache localement, puis fusionné
// avec la bibliothèque livrée dans l'app. Tout reste utilisable hors-ligne :
// sans réseau, on se contente du dernier cache connu (ou de la bibliothèque
// livrée si rien n'a encore été téléchargé).

import { BIBLIOTHEQUE } from "@/data/bibliotheque";
import { type Jeu } from "@/data/jeux";
import { ecrireMeta, lireMeta } from "@/db/database";

// URL du catalogue distant. Pour changer d'hébergement (GitHub Pages,
// Cloudflare…), il suffit de remplacer cette seule ligne.
const CATALOGUE_URL =
  "https://raw.githubusercontent.com/ZarAki2330/meep-meep/main/catalogue.json";

const CLE_CACHE = "catalogue_distant";
// Signature de la version en cache, renvoyée par l'hébergeur (en-tête ETag).
// La repasser en `If-None-Match` évite de retélécharger 497 ko quand rien n'a
// bougé : le serveur répond alors « 304 Non modifié », sans corps.
const CLE_SIGNATURE = "catalogue_signature";

/**
 * Fusionne la bibliothèque livrée et le catalogue distant : le distant prime
 * par identifiant. Il peut donc ajouter de nouveaux jeux ou corriger un jeu
 * déjà livré, sans jamais toucher aux jeux que l'utilisateur a ajoutés en base.
 */
export function fusionnerBibliotheque(distant: Jeu[]): Jeu[] {
  const parId = new Map<string, Jeu>();
  for (const j of BIBLIOTHEQUE) parId.set(j.id, j);
  for (const j of distant) parId.set(j.id, j);
  return [...parId.values()].sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
}

// ——— Mémoire de session ———
//
// Le catalogue pèse un demi-mégaoctet. Le relire dans SQLite puis le passer à
// JSON.parse coûte plusieurs centaines de millisecondes sur un téléphone
// d'entrée de gamme — et trois appelants le faisaient chacun de leur côté, à
// chaque montage : le contexte des jeux au démarrage, puis l'écran « Ajouter un
// jeu tout prêt » à chaque ouverture. On analyse donc une fois pour toutes, et
// tout le monde se partage le même tableau.
let memoire: Jeu[] | null = null;
let lectureEnCours: Promise<Jeu[]> | null = null;

/**
 * Le dernier catalogue téléchargé, depuis le cache local (ou [] s'il n'y en a
 * pas). Analysé une seule fois par session : les appels suivants renvoient
 * immédiatement le même tableau, et deux appels simultanés partagent la même
 * lecture au lieu d'en déclencher deux.
 */
export async function catalogueEnCache(): Promise<Jeu[]> {
  if (memoire) return memoire;
  if (!lectureEnCours) {
    lectureEnCours = lireCache().finally(() => {
      lectureEnCours = null;
    });
  }
  return lectureEnCours;
}

async function lireCache(): Promise<Jeu[]> {
  const brut = await lireMeta(CLE_CACHE).catch(() => null);
  if (!brut) return [];
  try {
    const v = JSON.parse(brut);
    if (!Array.isArray(v)) return [];
    memoire = v as Jeu[];
    return memoire;
  } catch {
    return [];
  }
}

let rafraichissement: Promise<Jeu[] | null> | null = null;

/**
 * Télécharge le catalogue distant et le met en cache. Silencieux en cas d'échec
 * (hors-ligne, serveur indisponible, JSON invalide) : on conserve le dernier
 * cache connu. Renvoie le catalogue frais s'il a changé, `null` sinon — ce qui
 * évite à l'appelant de relire et réanalyser ce qu'on vient d'écrire.
 *
 * Le téléchargement est conditionnel : si l'on détient déjà une version et sa
 * signature, on la présente au serveur, qui répond « 304 Non modifié » et rien
 * d'autre quand le catalogue n'a pas changé. Le cas courant ne coûte donc plus
 * que quelques octets au lieu de 497 ko — appréciable en 4G limitée.
 *
 * Une seule mise à jour par session : le contexte des jeux et l'écran du
 * catalogue appellent tous deux cette fonction, et rouvrir l'écran dix fois
 * dans la soirée ne doit pas déclencher dix requêtes. Ils se partagent donc la
 * même promesse.
 */
export function rafraichirCatalogue(): Promise<Jeu[] | null> {
  if (!rafraichissement) rafraichissement = telechargerCatalogue();
  return rafraichissement;
}

async function telechargerCatalogue(): Promise<Jeu[] | null> {
  try {
    const entetes: Record<string, string> = { Accept: "application/json" };
    // La signature ne vaut que si le cache qu'elle décrit est encore là :
    // sinon le serveur répondrait 304 et on resterait sans catalogue.
    const signature = await lireMeta(CLE_SIGNATURE).catch(() => null);
    if (signature && (await lireMeta(CLE_CACHE).catch(() => null))) {
      entetes["If-None-Match"] = signature;
    }

    const res = await fetch(CATALOGUE_URL, { headers: entetes });
    // 304 : le cache local est à jour, il n'y a rien à réécrire.
    if (res.status === 304) return null;
    if (!res.ok) return null;
    const donnees: unknown = await res.json();
    if (!Array.isArray(donnees)) return null;
    // Validation minimale : on ne garde que des entrées ayant au moins un id et un nom.
    const valides = donnees.filter(
      (j): j is Jeu =>
        typeof j === "object" &&
        j !== null &&
        typeof (j as Partial<Jeu>).id === "string" &&
        typeof (j as Partial<Jeu>).nom === "string",
    );
    await ecrireMeta(CLE_CACHE, JSON.stringify(valides));
    // La mémoire de session suit le cache : sans ça, les écrans déjà ouverts
    // continueraient de lire l'ancienne version jusqu'au prochain démarrage.
    memoire = valides;

    // La signature est écrite après le cache, et seulement s'il y en a une :
    // dans cet ordre, une écriture interrompue laisse au pire une signature
    // absente — donc un téléchargement complet de trop, jamais un 304 sur un
    // cache qui n'existe pas.
    const etag = res.headers.get("ETag");
    await ecrireMeta(CLE_SIGNATURE, etag ?? "");
    return valides;
  } catch {
    return null;
  }
}
