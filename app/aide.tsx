// app/aide.tsx — mode d'emploi de Meep Meep
//
// Le contenu vit dans data/aide.ts. Cet écran ne fait que le déplier.
// Appelé avec un paramètre « section », il ouvre celle-là et défile jusqu'à elle :
// c'est ce que font les icônes « ? » du formulaire d'ajout d'un jeu.

import { useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Entete } from "@/components/entete";
import { type AppColors } from "@/constants/theme-colors";
import { useTheme } from "@/context/theme";
import { SECTIONS_AIDE } from "@/data/aide";

export default function Aide() {
  const { section } = useLocalSearchParams<{ section?: string }>();
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  const demandee = SECTIONS_AIDE.findIndex((s) => s.cle === section);
  const [ouverte, setOuverte] = useState<number | null>(demandee >= 0 ? demandee : 0);

  const scroll = useRef<ScrollView>(null);
  // Le défilement attend de connaître la position de la section : on la reçoit
  // au premier rendu, via onLayout. Une seule fois, sinon on lutterait contre
  // le doigt de l'utilisateur.
  const defilementFait = useRef(demandee <= 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.page }}>
      <Entete titre="Aide" />
      <ScrollView ref={scroll} style={styles.page} contentContainerStyle={styles.contenu}>
        <Text style={styles.intro}>
          Meep Meep tient les scores de tes soirées. Voici ce qu&apos;il sait faire, et comment le
          lui demander.
        </Text>

        {SECTIONS_AIDE.map((s, i) => {
          const ouvert = ouverte === i;
          return (
            <View
              key={s.cle}
              style={styles.bloc}
              onLayout={(e) => {
                if (defilementFait.current || i !== demandee) return;
                defilementFait.current = true;
                const y = e.nativeEvent.layout.y;
                scroll.current?.scrollTo({ y: Math.max(y - 12, 0), animated: true });
              }}
            >
              <TouchableOpacity
                style={styles.entete}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={s.titre}
                accessibilityState={{ expanded: ouvert }}
                // Une seule section ouverte : la liste reste lisible d'un coup d'œil.
                onPress={() => setOuverte(ouvert ? null : i)}
              >
                <Text style={[styles.titre, ouvert && styles.titreOuvert]}>{s.titre}</Text>
                <View
                  style={styles.chevronBadge}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                >
                  <Text style={styles.chevron}>{ouvert ? "▾" : "▸"}</Text>
                </View>
              </TouchableOpacity>

              {ouvert && (
                <View style={styles.corps}>
                  {s.blocs.map((b, k) =>
                    Array.isArray(b) ? (
                      <View key={k} style={styles.liste}>
                        {b.map((point, n) => (
                          <View key={n} style={styles.point}>
                            <View style={styles.puce} />
                            <Text style={styles.pointTexte}>{point}</Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text key={k} style={styles.paragraphe}>
                        {b}
                      </Text>
                    ),
                  )}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    page: { flex: 1, backgroundColor: c.page },
    contenu: { padding: 16, paddingBottom: 40 },
    intro: { fontSize: 14, color: c.textSecondary, lineHeight: 21, marginBottom: 18 },

    bloc: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      marginBottom: 10,
      overflow: "hidden",
    },
    entete: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      padding: 14,
    },
    titre: { flex: 1, fontSize: 15, fontWeight: "600", color: c.textPrimary },
    titreOuvert: { color: c.accentText },
    chevronBadge: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: c.accentSoft,
      alignItems: "center",
      justifyContent: "center",
    },
    chevron: { fontSize: 12, color: c.accentText },

    corps: { paddingHorizontal: 14, paddingBottom: 14, gap: 10 },
    paragraphe: { fontSize: 14, color: c.textSecondary, lineHeight: 21 },
    liste: { gap: 8 },
    point: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
    puce: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.accent, marginTop: 8 },
    pointTexte: { flex: 1, fontSize: 14, color: c.textSecondary, lineHeight: 21 },
  });
}
