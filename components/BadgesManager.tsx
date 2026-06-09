import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  FlatList,
  Pressable,
  Modal,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { IonIcon } from "@/components/icons/AppVectorIcons";
import { useBadgesSystem, Badge } from "@/utils/badgesSystem";
import { useThemeColors } from "@/hooks/useThemeColor";

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

type CategoryFilterEntry = { key: string; name: string };

type CategoryFilterButtonProps = {
  item: CategoryFilterEntry;
  isSelected: boolean;
  onSelect: (key: string) => void;
  colors: ReturnType<typeof useThemeColors>;
};

const CategoryFilterButton = React.memo(function CategoryFilterButton({
  item,
  isSelected,
  onSelect,
  colors,
}: CategoryFilterButtonProps) {
  return (
    <Pressable
      style={[
        styles.categoryButton,
        {
          backgroundColor: isSelected ? colors.primary : colors.cardBG,
        },
      ]}
      onPress={() => onSelect(item.key)}
    >
      <Text
        style={[
          styles.categoryButtonText,
          {
            color: isSelected ? "white" : colors.text,
          },
        ]}
      >
        {item.name}
      </Text>
    </Pressable>
  );
});

type BadgeCategoryFilterProps = {
  data: CategoryFilterEntry[];
  selectedCategory: string;
  onSelectCategory: (key: string) => void;
  colors: ReturnType<typeof useThemeColors>;
};

const BadgeCategoryFilter = React.memo(function BadgeCategoryFilter({
  data,
  selectedCategory,
  onSelectCategory,
  colors,
}: BadgeCategoryFilterProps) {
  const renderCategoryItem = useCallback(
    ({ item }: { item: CategoryFilterEntry }) => (
      <CategoryFilterButton
        item={item}
        isSelected={selectedCategory === item.key}
        onSelect={onSelectCategory}
        colors={colors}
      />
    ),
    [selectedCategory, onSelectCategory, colors]
  );

  return (
    <FlatList
      horizontal
      data={data}
      keyExtractor={(item) => item.key}
      showsHorizontalScrollIndicator={false}
      style={styles.categoryFilter}
      contentContainerStyle={styles.categoryFilterContent}
      renderItem={renderCategoryItem}
    />
  );
});

type BadgeDetailsModalProps = {
  badge: Badge;
  visible: boolean;
  unlocked: boolean;
  progress: number;
  colors: ReturnType<typeof useThemeColors>;
  system: ReturnType<typeof useBadgesSystem>["system"];
  onClose: () => void;
};

const BadgeDetailsModal = React.memo(function BadgeDetailsModal({
  badge,
  visible,
  unlocked,
  progress,
  colors,
  system,
  onClose,
}: BadgeDetailsModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.cardBG }]}>
          <Pressable style={styles.modalCloseButton} onPress={onClose}>
            <IonIcon name="close" size={24} color={colors.text} />
          </Pressable>

          <View style={styles.modalHeader}>
            <View
              style={[
                styles.modalBadgeIcon,
                {
                  backgroundColor: unlocked
                    ? system.getBadgeColor(badge)
                    : colors.textSecondary,
                },
              ]}
            >
              <IonIcon name={badge.icon as any} size={32} color="white" />
            </View>

            <Text style={[styles.modalBadgeTitle, { color: colors.text }]}>
              {system.getLocalizedBadgeText(badge, "name")}
            </Text>

            <Text
              style={[
                styles.modalBadgeDescription,
                { color: colors.textSecondary },
              ]}
            >
              {system.getLocalizedBadgeText(badge, "description")}
            </Text>
          </View>

          <View style={styles.modalStats}>
            <View style={styles.modalStatItem}>
              <Text
                style={[styles.modalStatLabel, { color: colors.textSecondary }]}
              >
                Points
              </Text>
              <Text style={[styles.modalStatValue, { color: colors.text }]}>
                {badge.points}
              </Text>
            </View>

            <View style={styles.modalStatItem}>
              <Text
                style={[styles.modalStatLabel, { color: colors.textSecondary }]}
              >
                Catégorie
              </Text>
              <Text
                style={[
                  styles.modalStatValue,
                  { color: system.getBadgeColor(badge) },
                ]}
              >
                {badge.category}
              </Text>
            </View>

            <View style={styles.modalStatItem}>
              <Text
                style={[styles.modalStatLabel, { color: colors.textSecondary }]}
              >
                Type
              </Text>
              <Text
                style={[
                  styles.modalStatValue,
                  { color: system.getBadgeColor(badge) },
                ]}
              >
                {badge.requirement.type}
              </Text>
            </View>
          </View>

          {!unlocked && (
            <View style={styles.progressSection}>
              <Text style={[styles.progressLabel, { color: colors.text }]}>
                Progression: {progress.toFixed(0)}%
              </Text>
              <View
                style={[styles.progressBar, { backgroundColor: colors.cardBG }]}
              >
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${progress}%`,
                      backgroundColor: system.getBadgeColor(badge),
                    },
                  ]}
                />
              </View>
            </View>
          )}

          {unlocked && badge.unlocked_at && (
            <View style={styles.unlockedSection}>
              <Text style={[styles.unlockedText, { color: colors.success }]}>
                ✅ Débloqué le{" "}
                {new Date(badge.unlocked_at).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
});

const BadgeCard: React.FC<BadgeCardProps> = ({
  badge,
  isUnlocked,
  onPress,
  colors,
}) => {
  const { system } = useBadgesSystem();
  const { width } = useWindowDimensions();

  return (
    <Pressable
      style={[
        styles.badgeCard,
        { width: (width - 48) / 2 },
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
        <IonIcon name={badge.icon as any} size={20} color="white" />
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
          <IonIcon name="checkmark-circle" size={16} color={colors.success} />
        </View>
      )}
    </Pressable>
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
  const unlockedBadges = useMemo(
    () => system.getUnlockedBadges(userStats),
    [userStats, system],
  );

  const notifiedBadgeCodesRef = useRef<Set<string> | null>(null);
  if (!notifiedBadgeCodesRef.current) {
    notifiedBadgeCodesRef.current = new Set();
  }
  const onBadgeUnlockedRef = useRef(onBadgeUnlocked);
  onBadgeUnlockedRef.current = onBadgeUnlocked;

  useEffect(() => {
    const notify = onBadgeUnlockedRef.current;
    if (!notify) return;
    for (const badge of unlockedBadges) {
      if (!notifiedBadgeCodesRef.current!.has(badge.code)) {
        notifiedBadgeCodesRef.current!.add(badge.code);
        notify(badge);
      }
    }
  }, [unlockedBadges]);

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

  const openBadgeDetails = useCallback((badge: Badge) => {
    setSelectedBadge(badge);
    setModalVisible(true);
  }, []);

  const closeBadgeDetails = useCallback(() => {
    setModalVisible(false);
  }, []);

  const categoryFilterData = React.useMemo(
    () => [
      { key: "all", name: "Tous" },
      ...Object.entries(categories).map(([key, category]) => ({
        key,
        name: category.name,
      })),
    ],
    [categories]
  );

  const selectedBadgeUnlocked = selectedBadge
    ? isUnlocked(selectedBadge)
    : false;
  const selectedBadgeProgress = selectedBadge
    ? getProgressTowards(selectedBadge)
    : 0;

  return (
    <View style={styles.container}>
      <BadgeCategoryFilter
        data={categoryFilterData}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        colors={colors}
      />

      <View style={styles.badgesGrid}>
        {filteredBadges.map((badge) => (
          <BadgeCard
            key={badge.code}
            badge={badge}
            isUnlocked={isUnlocked(badge)}
            onPress={() => openBadgeDetails(badge)}
            colors={colors}
          />
        ))}
      </View>

      {selectedBadge && (
        <BadgeDetailsModal
          badge={selectedBadge}
          visible={modalVisible}
          unlocked={selectedBadgeUnlocked}
          progress={selectedBadgeProgress}
          colors={colors}
          system={system}
          onClose={closeBadgeDetails}
        />
      )}
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
