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

/** Le dernier catalogue téléchargé, depuis le cache local (ou [] s'il n'y en a pas). */
export async function catalogueEnCache(): Promise<Jeu[]> {
  const brut = await lireMeta(CLE_CACHE).catch(() => null);
  if (!brut) return [];
  try {
    const v = JSON.parse(brut);
    return Array.isArray(v) ? (v as Jeu[]) : [];
  } catch {
    return [];
  }
}

/**
 * Télécharge le catalogue distant et le met en cache. Silencieux en cas d'échec
 * (hors-ligne, serveur indisponible, JSON invalide) : on conserve le dernier
 * cache connu. Renvoie true si un nouveau catalogue a été enregistré.
 */
export async function rafraichirCatalogue(): Promise<boolean> {
  try {
    const res = await fetch(CATALOGUE_URL, { headers: { Accept: "application/json" } });
    if (!res.ok) return false;
    const donnees: unknown = await res.json();
    if (!Array.isArray(donnees)) return false;
    // Validation minimale : on ne garde que des entrées ayant au moins un id et un nom.
    const valides = donnees.filter(
      (j): j is Jeu =>
        typeof j === "object" &&
        j !== null &&
        typeof (j as Partial<Jeu>).id === "string" &&
        typeof (j as Partial<Jeu>).nom === "string",
    );
    await ecrireMeta(CLE_CACHE, JSON.stringify(valides));
    return true;
  } catch {
    return false;
  }
}
