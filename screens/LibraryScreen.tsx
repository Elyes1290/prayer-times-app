import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import ThemedImageBackground from "../components/ThemedImageBackground";
import {
  useThemeColors,
  useOverlayTextColor,
  useCurrentTheme,
} from "../hooks/useThemeColor";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const cardWidth = (width - 60) / 2; // 2 colonnes avec marges

interface LibraryItemProps {
  icon: string;
  title: string;
  subtitle: string;
  colors: string[];
  onPress: () => void;
}

const LibraryItem = ({ icon, title, subtitle, colors, onPress }: LibraryItemProps) => {
  const overlayTextColor = useOverlayTextColor();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.cardContainer}
    >
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.cardContent}>
          <MaterialCommunityIcons
            name={icon as any}
            size={48}
            color="#FFFFFF"
            style={styles.cardIcon}
          />
          <Text style={[styles.cardTitle, { color: "#FFFFFF" }]}>{title}</Text>
          <Text style={[styles.cardSubtitle, { color: "rgba(255,255,255,0.8)" }]}>
            {subtitle}
          </Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

export default function LibraryScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const overlayTextColor = useOverlayTextColor();
  const currentTheme = useCurrentTheme();

  const libraryItems = [
    {
      icon: "book-open-variant",
      title: t("favorites_screen.quran") || "Coran",
      subtitle: t("read_listen") || "Lire et écouter",
      colors: ["#1e3a5f", "#2d5a8f"],
      route: "/quran",
    },
    {
      icon: "book-multiple",
      title: t("favorites_screen.hadith") || "Hadiths",
      subtitle: t("prophetic_traditions") || "Traditions prophétiques",
      colors: ["#2d4a3e", "#3d6a5e"],
      route: "/hadith",
    },
    {
      icon: "hand-heart",
      title: t("favorites_screen.dhikr") || "Dhikr",
      subtitle: t("invocations") || "Invocations",
      colors: ["#5a3d2d", "#8a6d5d"],
      route: "/dhikr",
    },
    {
      icon: "star-circle",
      title: t("asmaul_husna") || "Asmaul Husna",
      subtitle: t("99_names") || "99 noms d'Allah",
      colors: ["#4a2d5a", "#6a4d7a"],
      route: "/asmaulhusna",
    },
    {
      icon: "account-heart",
      title: t("prophet_stories") || "Histoires du Prophète",
      subtitle: t("prophetic_biography") || "Biographie prophétique",
      colors: ["#3d2a4a", "#5d4a6a"],
      route: "/prophet-stories",
    },
    {
      icon: "heart-multiple",
      title: t("favorites") || "Favoris",
      subtitle: t("saved_content") || "Contenu sauvegardé",
      colors: ["#4a3d2a", "#6a5d4a"],
      route: "/favorites",
    },
  ];

  return (
    <ThemedImageBackground style={styles.background}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerTitle, { color: overlayTextColor }]}>
              📚 {t("library") || "Bibliothèque"}
            </Text>
            <Text style={[styles.headerSubtitle, { color: overlayTextColor, opacity: 0.7 }]}>
              {t("islamic_knowledge") || "Ressources spirituelles"}
            </Text>
          </View>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.grid}>
            {libraryItems.map((item, index) => (
              <LibraryItem
                key={index}
                icon={item.icon}
                title={item.title}
                subtitle={item.subtitle}
                colors={item.colors}
                onPress={() => router.push(item.route as any)}
              />
            ))}
          </View>

          {/* Info supplémentaire */}
          <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
            <MaterialCommunityIcons
              name="information-outline"
              size={24}
              color={colors.primary}
            />
            <Text style={[styles.infoText, { color: colors.text }]}>
              {t("library_info") || "Accédez à l'ensemble des ressources spirituelles en un seul endroit"}
            </Text>
          </View>
        </ScrollView>
      </View>
    </ThemedImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  cardContainer: {
    width: cardWidth,
    marginBottom: 20,
  },
  card: {
    borderRadius: 20,
    overflow: "hidden",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  cardContent: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 180,
  },
  cardIcon: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    textAlign: "center",
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginTop: 10,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
