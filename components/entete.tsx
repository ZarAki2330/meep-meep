// components/entete.tsx
// En-tête maison : placé dans la zone sûre, il se repositionne dès que la
// hauteur de la barre d'état est connue (l'en-tête natif, lui, se fige).

import { useRouter } from "expo-router";
import { type ReactNode } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { type AppColors } from "@/constants/theme-colors";
import { useTheme } from "@/context/theme";
import { IconSymbol } from "./ui/icon-symbol";

export function Entete({
  titre,
  droite,
  retour = true,
}: {
  titre: string;
  droite?: ReactNode;
  retour?: boolean;
}) {
  const { colors } = useTheme();
  const router = useRouter();
  const styles = makeStyles(colors);

  return (
    <SafeAreaView edges={["top"]} style={styles.zone}>
      <View style={styles.barre}>
        {retour ? (
          <TouchableOpacity
            style={styles.retour}
            hitSlop={10}
            onPress={() => router.back()}
            accessibilityLabel="Retour"
          >
            <IconSymbol name="chevron.left" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.retour} />
        )}

        {/* La barre fait 56 px : au-delà d'une fois et demie, le titre se coupe. */}
        <Text style={styles.titre} numberOfLines={1} maxFontSizeMultiplier={1.5}>
          {titre}
        </Text>

        <View style={styles.droite}>{droite}</View>
      </View>
    </SafeAreaView>
  );
}

function makeStyles(c: AppColors) {
  return StyleSheet.create({
    zone: { backgroundColor: c.surface },
    barre: {
      height: 56,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 8,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    retour: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
    titre: {
      flex: 1,
      fontSize: 19,
      fontWeight: "600",
      color: c.textPrimary,
      marginLeft: 4,
    },
    droite: { flexDirection: "row", alignItems: "center", minWidth: 44, justifyContent: "flex-end" },
  });
}
