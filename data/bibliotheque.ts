// data/bibliotheque.ts
// La bibliothèque de jeux tout prêts, livrée avec l'application.
//
// Ces jeux ne sont pas dans le catalogue de l'utilisateur : ils attendent qu'on
// les y ajoute, depuis l'écran « Ajouter un jeu tout prêt ». Une fois ajouté, un
// jeu est une entrée ordinaire de la base locale — modifiable et supprimable
// comme les autres.
//
// L'id d'un jeu de la bibliothèque devient l'id du jeu ajouté. C'est voulu : un
// jeu supprimé puis remis retrouve ses favoris et son historique de parties.
//
// ——— Pourquoi le même fichier que le catalogue distant ———
//
// Le contenu vient directement de `catalogue.json`, à la racine du dépôt. Ce
// fichier a désormais deux rôles : il est **publié sur GitHub**, d'où
// l'application le retélécharge pour se mettre à jour, et il est **embarqué dans
// le paquet**, d'où elle le lit au tout premier lancement, avant d'avoir vu le
// réseau.
//
// Les deux rôles ne s'opposent pas, ils se relaient. Au premier démarrage, et
// hors connexion, l'utilisateur voit les 428 jeux immédiatement au lieu d'une
// poignée. Dès qu'une version plus récente est publiée, `fusionnerBibliotheque`
// la fait primer par identifiant : le catalogue distant peut ajouter des jeux et
// en corriger d'autres **sans republier l'application**. La copie embarquée est
// un point de départ, jamais un plafond.
//
// Concrètement, pour ajouter des jeux plus tard : modifier `catalogue.json`, le
// pousser sur GitHub, et les applications déjà installées les verront au
// lancement suivant. La copie embarquée, elle, se met à jour d'elle-même au
// prochain build, puisque c'est le même fichier.

import catalogueLivre from "@/catalogue.json";

import { type Jeu } from "./jeux";

/**
 * Les jeux livrés avec l'application, prêts à être ajoutés au catalogue.
 *
 * La conversion de type est assumée : TypeScript déduit d'un JSON des types
 * larges (`string` là où le modèle attend `"max" | "min"`), et le catalogue
 * distant subit exactement la même conversion dans `lib/catalogue.ts`. La
 * validation se fait à l'usage, pas à la compilation.
 */
export const BIBLIOTHEQUE = catalogueLivre as unknown as Jeu[];

/**
 * Les jeux insérés en base à l'amorçage, au tout premier lancement.
 *
 * Volontairement vide : aucun jeu n'est pré-installé. L'utilisateur part d'un
 * catalogue vierge et ajoute ce qu'il veut depuis « Ajouter un jeu tout prêt ».
 */
export const IDS_AMORCAGE: string[] = [];

/** Un jeu de la bibliothèque, ou undefined. */
export function jeuBibliotheque(id: string): Jeu | undefined {
  return BIBLIOTHEQUE.find((j) => j.id === id);
}
