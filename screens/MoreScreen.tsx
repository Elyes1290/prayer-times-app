import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import ThemedImageBackground from "../components/ThemedImageBackground";
import {
  useThemeColors,
  useOverlayTextColor,
} from "../hooks/useThemeColor";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePremium } from "../contexts/PremiumContext";

interface MenuItemProps {
  icon: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  badge?: string;
  isPremium?: boolean;
}

const MenuItem = ({ icon, title, subtitle, onPress, badge, isPremium }: MenuItemProps) => {
  const colors = useThemeColors();
  const { user } = usePremium();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.menuItem, { backgroundColor: colors.surface }]}
    >
      <View style={[styles.iconContainer, { backgroundColor: colors.primary + "20" }]}>
        <MaterialCommunityIcons name={icon as any} size={24} color={colors.primary} />
      </View>
      
      <View style={styles.menuContent}>
        <View style={styles.menuTextContainer}>
          <Text style={[styles.menuTitle, { color: colors.text }]}>{title}</Text>
          {subtitle && (
            <Text style={[styles.menuSubtitle, { color: colors.textSecondary }]}>
              {subtitle}
            </Text>
          )}
        </View>
        
        <View style={styles.menuRight}>
          {isPremium && !user?.isPremium && (
            <View style={styles.premiumBadge}>
              <MaterialCommunityIcons name="crown" size={14} color="#FFD700" />
            </View>
          )}
          {badge && (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={styles.badgeText}>{badge}</Text>
            </View>
          )}
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={colors.textSecondary}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function MoreScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const overlayTextColor = useOverlayTextColor();
  const { user } = usePremium();

  const menuSections = [
    {
      title: t("library") || "Bibliothèque",
      items: [
        {
          icon: "heart-multiple",
          title: t("favorites") || "Favoris",
          subtitle: t("saved_content") || "Contenu sauvegardé",
          route: "/favorites",
        },
        {
          icon: "account-heart",
          title: t("prophet_stories") || "Histoires du Prophète",
          subtitle: t("prophetic_biography") || "Biographie prophétique",
          route: "/prophet-stories",
        },
      ],
    },
    {
      title: t("tools") || "Outils",
      items: [
        {
          icon: "mosque",
          title: t("mosques") || "Mosquées",
          subtitle: t("find_nearby") || "Trouver à proximité",
          route: "/mosques",
        },
        {
          icon: "counter",
          title: t("tasbih.title") || "Tasbih",
          subtitle: t("digital_counter") || "Compteur numérique",
          route: "/tasbih",
        },
        {
          icon: "calendar",
          title: t("hijri_calendar") || "Calendrier Hijri",
          subtitle: t("islamic_dates") || "Dates islamiques",
          route: "/hijri",
        },
      ],
    },
    {
      title: t("premium") || "Premium",
      items: [
        {
          icon: "chart-bar",
          title: t("prayer_stats") || "Statistiques",
          subtitle: t("track_prayers") || "Suivre vos prières",
          route: "/prayerStatsPremium",
          isPremium: true,
        },
      ],
    },
    {
      title: t("account") || "Compte",
      items: [
        {
          icon: "cog",
          title: t("settings") || "Paramètres",
          subtitle: t("app_preferences") || "Préférences de l'application",
          route: "/settings",
        },
        {
          icon: "information",
          title: t("about") || "À propos",
          subtitle: t("app_info") || "Informations sur l'application",
          route: "/about",
        },
      ],
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
              ➕ {t("more") || "Plus"}
            </Text>
            <Text style={[styles.headerSubtitle, { color: overlayTextColor, opacity: 0.7 }]}>
              {t("additional_features") || "Fonctionnalités supplémentaires"}
            </Text>
          </View>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {menuSections.map((section, sectionIndex) => (
            <View key={sectionIndex} style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                {section.title}
              </Text>
              
              <View style={[styles.sectionContent, { backgroundColor: colors.cardBG }]}>
                {section.items.map((item, itemIndex) => (
                  <React.Fragment key={itemIndex}>
                    <MenuItem
                      icon={item.icon}
                      title={item.title}
                      subtitle={item.subtitle}
                      onPress={() => router.push(item.route as any)}
                      isPremium={item.isPremium}
                    />
                    {itemIndex < section.items.length - 1 && (
                      <View style={[styles.separator, { backgroundColor: colors.border }]} />
                    )}
                  </React.Fragment>
                ))}
              </View>
            </View>
          ))}

          {/* Version info */}
          <View style={styles.versionContainer}>
            <Text style={[styles.versionText, { color: colors.textSecondary }]}>
              Prayer Times v1.0.0
            </Text>
            {user?.isPremium && (
              <View style={styles.premiumBadgeBottom}>
                <MaterialCommunityIcons name="crown" size={12} color="#FFD700" />
                <Text style={[styles.premiumText, { color: "#FFD700" }]}>
                  Premium
                </Text>
              </View>
            )}
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
    paddingVertical: 20,
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionContent: {
    borderRadius: 16,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 13,
  },
  menuRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  premiumBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255, 215, 0, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  separator: {
    height: 1,
    marginLeft: 76,
  },
  versionContainer: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 10,
  },
  versionText: {
    fontSize: 12,
  },
  premiumBadgeBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(255, 215, 0, 0.15)",
  },
  premiumText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
