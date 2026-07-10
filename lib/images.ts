// lib/images.ts
// Les photos choisies dans la galerie sont recopiées dans le stockage de l'app :
// sans cela elles disparaîtraient avec le cache du téléphone. Ce qui est copié
// doit être effacé un jour — c'est tout l'objet de ce fichier.
//
// Deux dossiers, une seule mécanique : les couvertures de jeux d'un côté, les
// portraits de joueurs de l'autre. Chacun se balaie séparément, en confrontant
// les fichiers présents aux images que la base réclame encore.
//
// Une image peut aussi être une simple URL (BoardGameGeek, web) : elle ne nous
// appartient pas, on n'y touche jamais. D'où « locale » un peu partout ici.

import * as FileSystemLegacy from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";

export const DOSSIER_JEUX = `${FileSystemLegacy.documentDirectory}images-jeux/`;
export const DOSSIER_JOUEURS = `${FileSystemLegacy.documentDirectory}images-joueurs/`;

/** Vrai si cette image est un fichier que l'app a écrit, donc qu'elle peut effacer. */
export function estImageLocale(uri?: string | null): uri is string {
  return !!uri && (uri.startsWith(DOSSIER_JEUX) || uri.startsWith(DOSSIER_JOUEURS));
}

/** Recopie une photo dans le stockage de l'app, et rend son chemin. */
export async function copierImage(source: string, dossier: string): Promise<string> {
  await FileSystemLegacy.makeDirectoryAsync(dossier, { intermediates: true }).catch(() => {});
  const destination = `${dossier}${Date.now()}.jpg`;
  await FileSystemLegacy.copyAsync({ from: source, to: destination });
  return destination;
}

/**
 * Ouvre la galerie et rend le chemin de la copie, ou null si l'utilisateur renonce.
 * Lève une erreur si l'accès aux photos est refusé : à l'appelant de la montrer.
 */
export async function choisirPhoto(dossier: string): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Autorise l'accès à tes photos pour en choisir une.");
  }
  // Pas de recadrage : sur Android, l'écran de recadrage natif masque parfois
  // son bouton de validation.
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: false,
    selectionLimit: 1,
    quality: 0.8,
  });
  if (res.canceled || !res.assets?.[0]) return null;
  return copierImage(res.assets[0].uri, dossier);
}

/** Efface une photo. Sans effet sur une URL, ou sur un fichier déjà parti. */
export async function supprimerImage(uri?: string | null) {
  if (!estImageLocale(uri)) return;
  await FileSystemLegacy.deleteAsync(uri, { idempotent: true }).catch(() => {});
}

/**
 * Efface, dans un dossier, les photos que plus personne ne réclame.
 *
 * Le filet de sécurité, appelé au démarrage : il rattrape les orphelines des
 * versions précédentes, celles d'une restauration de sauvegarde, et celles
 * qu'une suppression aurait manquées. Rend le nombre de fichiers effacés.
 *
 * À n'appeler qu'avec la liste complète des images utilisées : une liste
 * partielle effacerait des photos encore vivantes.
 */
export async function nettoyerImagesOrphelines(
  dossier: string,
  imagesUtilisees: (string | undefined | null)[],
) {
  const info = await FileSystemLegacy.getInfoAsync(dossier).catch(() => null);
  if (!info?.exists) return 0;

  const fichiers = await FileSystemLegacy.readDirectoryAsync(dossier).catch(() => []);
  const gardees = new Set(
    imagesUtilisees
      .filter((uri): uri is string => !!uri && uri.startsWith(dossier))
      .map((uri) => uri.slice(dossier.length)),
  );

  let effacees = 0;
  for (const fichier of fichiers) {
    if (gardees.has(fichier)) continue;
    await FileSystemLegacy.deleteAsync(`${dossier}${fichier}`, { idempotent: true }).catch(() => {});
    effacees++;
  }
  return effacees;
}
