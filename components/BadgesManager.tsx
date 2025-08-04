import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useBadgesSystem, Badge } from "@/utils/badgesSystem";
import { useThemeColors } from "@/hooks/useThemeColor";

const { width } = Dimensions.get("window");

interface BadgesManagerProps {
  userStats: any;
  onBadgeUnlocked?: (badge: Badge) => void;
}

interface BadgeCardProps {
  badge: Badge;
  isUnlocked: boolean;
  onPress: () => void;
  colors: any;
}

const BadgeCard: React.FC<BadgeCardProps> = ({
  badge,
  isUnlocked,
  onPress,
  colors,
}) => {
  const { system } = useBadgesSystem();

  return (
    <TouchableOpacity
      style={[
        styles.badgeCard,
        {
          backgroundColor: isUnlocked
            ? `${system.getBadgeColor(badge)}20`
            : "rgba(149, 165, 166, 0.1)",
          borderColor: isUnlocked
            ? system.getBadgeColor(badge)
            : colors.textSecondary,
          borderWidth: isUnlocked ? 2 : 1,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.badgeIcon,
          {
            backgroundColor: isUnlocked
              ? system.getBadgeColor(badge)
              : colors.textSecondary,
          },
        ]}
      >
        <Ionicons name={badge.icon as any} size={20} color="white" />
      </View>

      <Text
        style={[styles.badgeName, { color: colors.text }]}
        numberOfLines={2}
      >
        {system.getLocalizedBadgeText(badge, "name")}
      </Text>

      <Text
        style={[styles.badgeDescription, { color: colors.textSecondary }]}
        numberOfLines={3}
      >
        {system.getLocalizedBadgeText(badge, "description")}
      </Text>

      <View style={styles.badgeFooter}>
        <Text
          style={[styles.badgePoints, { color: system.getBadgeColor(badge) }]}
        >
          +{badge.points} pts
        </Text>

        <View
          style={[
            styles.categoryBadge,
            { backgroundColor: system.getBadgeColor(badge) },
          ]}
        >
          <Text style={styles.categoryText}>
            {badge.category.toUpperCase()}
          </Text>
        </View>
      </View>

      {isUnlocked && (
        <View style={styles.unlockedIndicator}>
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
        </View>
      )}
    </TouchableOpacity>
  );
};

export const BadgesManager: React.FC<BadgesManagerProps> = ({
  userStats,
  onBadgeUnlocked,
}) => {
  const { system, getAllBadges, getCategories } = useBadgesSystem();
  const colors = useThemeColors();

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [unlockedBadges, setUnlockedBadges] = useState<Badge[]>([]);

  useEffect(() => {
    // Calculer les badges débloqués
    const unlocked = system.getUnlockedBadges(userStats);
    setUnlockedBadges(unlocked);

    // Notifier les nouveaux badges débloqués
    if (onBadgeUnlocked) {
      unlocked.forEach((badge) => {
        // Vérifier si c'est un nouveau badge (logique à adapter)
        onBadgeUnlocked(badge);
      });
    }
  }, [userStats, system, onBadgeUnlocked]);

  const categories = getCategories();
  const allBadges = getAllBadges();

  const filteredBadges =
    selectedCategory === "all"
      ? allBadges
      : allBadges.filter((badge) => badge.category === selectedCategory);

  const isUnlocked = (badge: Badge): boolean => {
    return unlockedBadges.some((unlocked) => unlocked.code === badge.code);
  };

  const getProgressTowards = (badge: Badge): number => {
    const progress = system.checkBadgeCondition(badge, userStats);
    if (progress) return 100;

    // Calculer le pourcentage de progression vers le badge
    const { requirement } = badge;
    let current = 0;

    switch (requirement.type) {
      case "count":
        switch (badge.category) {
          case "prayer":
            current = userStats.total_prayers || 0;
            break;
          case "dhikr":
            current = userStats.total_dhikr_sessions || 0;
            break;
          case "quran":
            current = userStats.total_quran_sessions || 0;
            break;
          case "hadith":
            current = userStats.total_hadith_read || 0;
            break;
          case "social":
            current = userStats.content_shared || 0;
            break;
          default:
            return 0;
        }
        break;
      case "streak":
        current = userStats.current_streak || 0;
        break;
      default:
        return 0;
    }

    return Math.min((current / requirement.value) * 100, 100);
  };

  const openBadgeDetails = (badge: Badge) => {
    setSelectedBadge(badge);
    setModalVisible(true);
  };

  const renderCategoryFilter = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.categoryFilter}
      contentContainerStyle={styles.categoryFilterContent}
    >
      <TouchableOpacity
        style={[
          styles.categoryButton,
          {
            backgroundColor:
              selectedCategory === "all" ? colors.primary : colors.cardBG,
          },
        ]}
        onPress={() => setSelectedCategory("all")}
      >
        <Text
          style={[
            styles.categoryButtonText,
            { color: selectedCategory === "all" ? "white" : colors.text },
          ]}
        >
          Tous
        </Text>
      </TouchableOpacity>

      {Object.entries(categories).map(([key, category]) => (
        <TouchableOpacity
          key={key}
          style={[
            styles.categoryButton,
            {
              backgroundColor:
                selectedCategory === key ? colors.primary : colors.cardBG,
            },
          ]}
          onPress={() => setSelectedCategory(key)}
        >
          <Text
            style={[
              styles.categoryButtonText,
              { color: selectedCategory === key ? "white" : colors.text },
            ]}
          >
            {category.name}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderBadgeDetails = () => {
    if (!selectedBadge) return null;

    const unlocked = isUnlocked(selectedBadge);
    const progress = getProgressTowards(selectedBadge);

    return (
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor: colors.cardBG }]}
          >
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setModalVisible(false)}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>

            <View style={styles.modalHeader}>
              <View
                style={[
                  styles.modalBadgeIcon,
                  {
                    backgroundColor: unlocked
                      ? system.getBadgeColor(selectedBadge)
                      : colors.textSecondary,
                  },
                ]}
              >
                <Ionicons
                  name={selectedBadge.icon as any}
                  size={32}
                  color="white"
                />
              </View>

              <Text style={[styles.modalBadgeTitle, { color: colors.text }]}>
                {system.getLocalizedBadgeText(selectedBadge, "name")}
              </Text>

              <Text
                style={[
                  styles.modalBadgeDescription,
                  { color: colors.textSecondary },
                ]}
              >
                {system.getLocalizedBadgeText(selectedBadge, "description")}
              </Text>
            </View>

            <View style={styles.modalStats}>
              <View style={styles.modalStatItem}>
                <Text
                  style={[
                    styles.modalStatLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  Points
                </Text>
                <Text style={[styles.modalStatValue, { color: colors.text }]}>
                  {selectedBadge.points}
                </Text>
              </View>

              <View style={styles.modalStatItem}>
                <Text
                  style={[
                    styles.modalStatLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  Catégorie
                </Text>
                <Text
                  style={[
                    styles.modalStatValue,
                    { color: system.getBadgeColor(selectedBadge) },
                  ]}
                >
                  {selectedBadge.category}
                </Text>
              </View>

              <View style={styles.modalStatItem}>
                <Text
                  style={[
                    styles.modalStatLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  Type
                </Text>
                <Text
                  style={[
                    styles.modalStatValue,
                    { color: system.getBadgeColor(selectedBadge) },
                  ]}
                >
                  {selectedBadge.requirement.type}
                </Text>
              </View>
            </View>

            {!unlocked && (
              <View style={styles.progressSection}>
                <Text style={[styles.progressLabel, { color: colors.text }]}>
                  Progression: {progress.toFixed(0)}%
                </Text>
                <View
                  style={[
                    styles.progressBar,
                    { backgroundColor: colors.cardBG },
                  ]}
                >
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${progress}%`,
                        backgroundColor: system.getBadgeColor(selectedBadge),
                      },
                    ]}
                  />
                </View>
              </View>
            )}

            {unlocked && selectedBadge.unlocked_at && (
              <View style={styles.unlockedSection}>
                <Text style={[styles.unlockedText, { color: colors.success }]}>
                  ✅ Débloqué le{" "}
                  {new Date(selectedBadge.unlocked_at).toLocaleDateString()}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      {renderCategoryFilter()}

      <View style={styles.badgesGrid}>
        {filteredBadges.map((badge, index) => (
          <BadgeCard
            key={badge.code}
            badge={badge}
            isUnlocked={isUnlocked(badge)}
            onPress={() => openBadgeDetails(badge)}
            colors={colors}
          />
        ))}
      </View>

      {renderBadgeDetails()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  categoryFilter: {
    marginBottom: 16,
  },
  categoryFilterContent: {
    paddingHorizontal: 16,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  badgesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  badgeCard: {
    width: (width - 48) / 2,
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
    position: "relative",
  },
  badgeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    alignSelf: "center",
  },
  badgeName: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 4,
  },
  badgeDescription: {
    fontSize: 12,
    textAlign: "center",
    marginBottom: 8,
  },
  badgeFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badgePoints: {
    fontSize: 12,
    fontWeight: "600",
  },
  categoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 8,
    fontWeight: "700",
    color: "white",
  },
  unlockedIndicator: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    maxWidth: 400,
    padding: 24,
    borderRadius: 16,
    maxHeight: "80%",
  },
  modalCloseButton: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 1,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  modalBadgeIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  modalBadgeTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  modalBadgeDescription: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
  },
  modalStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 24,
  },
  modalStatItem: {
    alignItems: "center",
  },
  modalStatLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  modalStatValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  progressSection: {
    marginBottom: 16,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  unlockedSection: {
    alignItems: "center",
  },
  unlockedText: {
    fontSize: 14,
    fontWeight: "600",
  },
});

export default BadgesManager;
