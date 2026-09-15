// hooks/use-orientation-libre.ts
// Autorise la rotation de l'écran sur les seuls écrans qui en tirent un bénéfice
// réel : les feuilles de score en tableau, où chaque joueur occupe une colonne.
// En paysage, la largeur disponible double et les colonnes cessent de se
// tasser — c'est tout l'intérêt quand on est cinq ou six autour de la table.
//
// Le reste de l'application reste en portrait, verrouillé globalement par
// `orientation: "portrait"` dans app.json. Ce verrou est un simple réglage de
// manifeste : on peut le lever à l'exécution, écran par écran.
//
// Le principe est symétrique. On déverrouille en arrivant sur l'écran, on
// re-verrouille en le quittant, de sorte qu'aucun autre écran n'hérite jamais
// d'une orientation qu'il n'attend pas. `useFocusEffect` le fait aussi bien au
// retour arrière qu'à la mise en veille de l'écran par la navigation.

import * as ScreenOrientation from "expo-screen-orientation";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { Platform } from "react-native";

export function useOrientationLibre() {
  useFocusEffect(
    useCallback(() => {
      // Sur le web, l'orientation n'est pas pilotable : le module lève une
      // UnavailabilityError. On sort avant de l'appeler.
      if (Platform.OS === "web") return;

      // On ignore volontairement les échecs : une rotation refusée par le
      // système ne doit jamais empêcher la feuille de score de s'afficher.
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.ALL).catch(() => {});

      return () => {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(
          () => {},
        );
      };
    }, []),
  );
}
