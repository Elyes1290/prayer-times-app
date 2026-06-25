import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";
import {
  FlatList,
  Text,
  View,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { IonIcon } from "@/components/icons/AppVectorIcons";
import { LinearGradient } from "@/components/ui/LinearGradientView";
import ThemedImageBackground from "../components/ThemedImageBackground";
import { useLocalSearchParams } from "expo-router";
import FavoriteButton from "../components/FavoriteButton";
import { DhikrFavorite } from "../contexts/FavoritesContext";
import { useUpdateUserStats } from "../hooks/useUpdateUserStats";
import { usePremium } from "../contexts/PremiumContext";

const CATEGORIES = [
  { key: "dailyDua", namespace: "dhikr", icon: "calendar-outline" as const },
  { key: "morningDhikr", namespace: "dhikrMorning", icon: "sunny-outline" as const },
  { key: "eveningDhikr", namespace: "eveningDhikr", icon: "moon-outline" as const },
  { key: "afterSalah", namespace: "afterSalah", icon: "time-outline" as const },
  { key: "selectedDua", namespace: "selectedDua", icon: "star-outline" as const },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]["key"];

type DhikrScreenState = {
  selectedKey: CategoryKey;
  search: string;
};

function isValidCategoryKey(key: string | undefined): key is CategoryKey {
  return !!key && CATEGORIES.some((category) => category.key === key);
}

function createInitialScreenState(
  categoryParam: CategoryKey | undefined,
): DhikrScreenState {
  return {
    selectedKey: isValidCategoryKey(categoryParam)
      ? categoryParam
      : CATEGORIES[0].key,
    search: "",
  };
}

function convertToFavorite(
  item: any,
  category: CategoryKey,
): Omit<DhikrFavorite, "id" | "dateAdded"> {
  return {
    type: "dhikr",
    category,
    arabicText: item.arabic || "",
    translation: item.translation || "",
    transliteration: item.latin || "",
    source: item.source || "",
    benefits: item.benefits || item.fawaid || "",
  };
}

function useDhikrData(namespace: string) {
  const { i18n } = useTranslation(namespace);
  const raw = (i18n.getResource(i18n.language, namespace, "") as any[]) || [];
  const hasMeta = raw.length > 0 && raw[0][namespace];
  const meta = hasMeta ? raw[0][namespace] : {};
  const duas = hasMeta ? raw.slice(1) : raw;
  return { meta, duas };
}

type DhikrListItemProps = {
  item: any;
  index: number;
  selectedKey: CategoryKey;
  isPremium: boolean;
  language: string;
  onRecordDhikr: (count: number, category: CategoryKey) => Promise<void>;
  t: (key: string, fallback?: string) => string;
};

const DhikrListItem = React.memo(function DhikrListItem({
  item,
  index,
  selectedKey,
  isPremium,
  language,
  onRecordDhikr,
  t,
}: DhikrListItemProps) {
  const handleDhikrCompleted = async () => {
    if (!isPremium) {
      Alert.alert(
        t("premium_ui.feature_locked"),
        t("premium_ui.feature_premium_only"),
        [
          { text: t("cancel"), style: "cancel" },
          {
            text: t("upgrade_premium"),
            style: "default",
            onPress: () => {
              // TODO: Ouvrir l'écran premium
            },
          },
        ],
      );
      return;
    }

    try {
      await onRecordDhikr(1, selectedKey);
      Alert.alert(t("dhikr.recorded"), t("dhikr.added_to_stats"), [
        { text: t("ok") },
      ]);
    } catch (error) {
      console.error("Erreur enregistrement dhikr:", error);
      Alert.alert(t("error"), t("dhikr.record_error"));
    }
  };

  const showLatin = !language.startsWith("ar") && !!item.latin;
  const showTranslation = !language.startsWith("ar") && !!item.translation;
  const benefitText = item.benefits ?? item.fawaid;

  return (
    <View style={styles.card}>
      <LinearGradient
        colors={["rgba(21, 34, 56, 0.96)", "rgba(11, 21, 32, 0.94)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      >
        <View style={styles.cardTopBar}>
          <View style={styles.indexBadge}>
            <Text style={styles.indexText}>{index + 1}</Text>
          </View>
          <View style={styles.cardActions}>
            <FavoriteButton
              favoriteData={convertToFavorite(item, selectedKey)}
              size={22}
              iconColor="rgba(255, 255, 255, 0.75)"
              iconColorActive="#FFD700"
              style={styles.favoriteButton}
            />
            <Pressable
              style={[
                styles.recordButton,
                !isPremium && styles.recordButtonLocked,
              ]}
              onPress={handleDhikrCompleted}
              testID="dhikr-completed-button"
            >
              <IonIcon
                name="checkmark-circle"
                size={18}
                color={isPremium ? "#4ECDC4" : "rgba(255,255,255,0.35)"}
              />
              <Text style={styles.recordButtonText}>
                {t("dhikr.record")}
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.arabicBlock}>
          <Text style={styles.arabic}>{item.arabic}</Text>
        </View>

        {showLatin && <Text style={styles.translit}>{item.latin}</Text>}
        {showTranslation && (
          <Text style={styles.translation}>{item.translation}</Text>
        )}

        {item.source ? (
          <View style={styles.sourceRow}>
            <IonIcon name="book-outline" size={14} color="#8EB8E8" />
            <Text style={styles.reference}>{item.source}</Text>
          </View>
        ) : null}

        {!language.startsWith("ar") && benefitText ? (
          <View style={styles.benefitBox}>
            <Text style={styles.benefitLabel}>
              {t("dhikr.benefit")}
            </Text>
            <Text style={styles.benefit}>{benefitText}</Text>
          </View>
        ) : null}
      </LinearGradient>
    </View>
  );
});

export default function DhikrScreen() {
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const dhikrIndexParam = params.dhikrIndex
    ? parseInt(params.dhikrIndex as string, 10)
    : null;
  const categoryParam = params.category as CategoryKey | undefined;

  const flatListRef = useRef<FlatList>(null);
  const scrollTargetKeyRef = useRef<string | null>(null);

  const [screenState, setScreenState] = useState<DhikrScreenState>(() =>
    createInitialScreenState(categoryParam),
  );
  const prevCategoryParamRef = useRef(categoryParam);

  useEffect(() => {
    if (categoryParam === prevCategoryParamRef.current) {
      return;
    }

    prevCategoryParamRef.current = categoryParam;

    if (isValidCategoryKey(categoryParam)) {
      setScreenState({
        selectedKey: categoryParam,
        search: "",
      });
      scrollTargetKeyRef.current = null;
    }
  }, [categoryParam]);

  const { selectedKey, search } = screenState;

  const selectedCat = CATEGORIES.find((c) => c.key === selectedKey)!;
  const namespace = selectedCat.namespace;

  const { t, i18n } = useTranslation("");
  const { meta, duas } = useDhikrData(namespace);

  const categoryLabels = useMemo<Record<CategoryKey, string>>(
    () => ({
      dailyDua: t("dhikr.categories.dailyDua"),
      morningDhikr: t("dhikr.categories.morning"),
      eveningDhikr: t("dhikr.categories.evening"),
      afterSalah: t("dhikr.categories.afterSalah"),
      selectedDua: t("dhikr.categories.selectedDua"),
    }),
    [t],
  );

  const title = t("dhikr.title");
  const noDhikr = meta.no_dhikr || "No dhikr found for this category.";

  const filteredDuas = useMemo(() => {
    const lowerSearch = search.trim().toLowerCase();
    if (!lowerSearch) {
      return duas;
    }
    return duas.filter(
      (item) =>
        (item.arabic?.toLowerCase().includes(lowerSearch) ?? false) ||
        (item.latin?.toLowerCase().includes(lowerSearch) ?? false) ||
        (item.translation?.toLowerCase().includes(lowerSearch) ?? false),
    );
  }, [duas, search]);

  const onScrollToIndexFailed = useCallback(
    (info: {
      index: number;
      highestMeasuredFrameIndex: number;
      averageItemLength: number;
    }) => {
      flatListRef.current?.scrollToOffset({
        offset: info.averageItemLength * info.index,
        animated: false,
      });
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToIndex({
          index: info.index,
          animated: true,
          viewPosition: 0.1,
        });
      });
    },
    [],
  );

  useEffect(() => {
    if (dhikrIndexParam === null || filteredDuas.length === 0) {
      return;
    }

    const scrollKey = `${selectedKey}-${dhikrIndexParam}`;
    if (scrollTargetKeyRef.current === scrollKey) {
      return;
    }
    scrollTargetKeyRef.current = scrollKey;

    const indexToScroll = Math.min(dhikrIndexParam, filteredDuas.length - 1);

    const frame = requestAnimationFrame(() => {
      flatListRef.current?.scrollToIndex({
        index: indexToScroll,
        animated: true,
        viewPosition: 0.1,
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [dhikrIndexParam, filteredDuas.length, selectedKey]);

  const { recordDhikr } = useUpdateUserStats();
  const { user } = usePremium();

  const renderDhikrItem = useCallback(
    ({ item, index }: { item: any; index: number }) => (
      <DhikrListItem
        item={item}
        index={index}
        selectedKey={selectedKey}
        isPremium={user.isPremium}
        language={i18n.language}
        onRecordDhikr={recordDhikr}
        t={t}
      />
    ),
    [selectedKey, user.isPremium, i18n.language, recordDhikr, t],
  );

  const handleCategorySelect = useCallback((key: CategoryKey) => {
    setScreenState({ selectedKey: key, search: "" });
    scrollTargetKeyRef.current = null;
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, []);

  const renderCategoryChip = useCallback(
    ({ item: cat }: { item: (typeof CATEGORIES)[number] }) => {
      const isActive = selectedKey === cat.key;
      return (
        <Pressable
          testID={`category-${cat.key}`}
          onPress={() => handleCategorySelect(cat.key)}
          style={[
            styles.categoryChip,
            styles.categoryChipSpacing,
            isActive && styles.categoryChipActive,
          ]}
        >
          <View style={styles.categoryChipIcon}>
            <IonIcon
              name={cat.icon}
              size={15}
              color={isActive ? "#1A2332" : "rgba(255,255,255,0.8)"}
            />
          </View>
          <Text
            style={[
              styles.categoryChipText,
              isActive && styles.categoryChipTextActive,
            ]}
          >
            {categoryLabels[cat.key]}
          </Text>
        </Pressable>
      );
    },
    [selectedKey, categoryLabels, handleCategorySelect],
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.listHeader}>
        <Text style={styles.resultsCount}>
          {filteredDuas.length}{" "}
          {filteredDuas.length > 1 ? t("dhikr.items") : t("dhikr.item")}
        </Text>
      </View>
    ),
    [filteredDuas.length, t],
  );

  const listEmpty = useMemo(
    () => (
      <View style={styles.emptyWrap}>
        <IonIcon name="search-outline" size={40} color="rgba(255,255,255,0.35)" />
        <Text style={styles.emptyText}>{noDhikr}</Text>
      </View>
    ),
    [noDhikr],
  );

  return (
    <ThemedImageBackground
      style={[styles.background, { paddingTop: insets.top }]}
    >
      <View style={styles.overlay} pointerEvents="none" />

      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>
          {t("dhikr.subtitle")}
        </Text>
      </View>

      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={(item) => item.key}
        renderItem={renderCategoryChip}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryRow}
        style={styles.categoryScroll}
      />

      <View style={styles.searchContainer}>
        <IonIcon
          name="search"
          size={18}
          color="rgba(255,255,255,0.45)"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder={t("dhikr.search_placeholder")}
          placeholderTextColor="rgba(255,255,255,0.4)"
          value={search}
          onChangeText={(text) =>
            setScreenState((current) => ({ ...current, search: text }))
          }
          clearButtonMode="while-editing"
        />
        {search.length > 0 ? (
          <Pressable
            onPress={() =>
              setScreenState((current) => ({ ...current, search: "" }))
            }
            hitSlop={8}
          >
            <IonIcon name="close-circle" size={18} color="rgba(255,255,255,0.45)" />
          </Pressable>
        ) : null}
      </View>

      <FlatList
        ref={flatListRef}
        data={filteredDuas}
        keyExtractor={(item, idx) => `${selectedKey}-${item.arabic ?? ""}-${idx}`}
        renderItem={renderDhikrItem}
        extraData={`${selectedKey}-${search}-${user.isPremium}-${i18n.language}`}
        ListHeaderComponent={filteredDuas.length > 0 ? listHeader : null}
        ListEmptyComponent={listEmpty}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 120 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        initialNumToRender={8}
        maxToRenderPerBatch={6}
        windowSize={7}
        removeClippedSubviews={false}
        onScrollToIndexFailed={onScrollToIndexFailed}
      />
    </ThemedImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.58)",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
    alignItems: "center",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0.3,
  },
  subtitle: {
    color: "rgba(255, 255, 255, 0.55)",
    fontSize: 14,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  categoryScroll: {
    flexGrow: 0,
    marginTop: 14,
    minHeight: 52,
  },
  categoryRow: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    gap: 8,
    alignItems: "center",
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  categoryChipSpacing: {
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: "#E8C872",
    borderColor: "#E8C872",
  },
  categoryChipIcon: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryChipText: {
    color: "rgba(255, 255, 255, 0.88)",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "600",
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  categoryChipTextActive: {
    color: "#1A2332",
    fontWeight: "700",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 6,
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 46,
    color: "#FFFFFF",
    fontSize: 15,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  listHeader: {
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  resultsCount: {
    color: "rgba(255, 255, 255, 0.45)",
    fontSize: 13,
    fontWeight: "600",
  },
  card: {
    marginBottom: 14,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  cardGradient: {
    padding: 16,
  },
  cardTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  indexBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  indexText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 12,
    fontWeight: "700",
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  favoriteButton: {
    padding: 4,
  },
  recordButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "rgba(78, 205, 196, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(78, 205, 196, 0.35)",
  },
  recordButtonLocked: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  recordButtonText: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 12,
    fontWeight: "600",
  },
  arabicBlock: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  arabic: {
    fontSize: 28,
    color: "#FFFFFF",
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 44,
    writingDirection: "rtl",
  },
  translit: {
    color: "#A8C4E8",
    fontSize: 15,
    marginBottom: 8,
    fontStyle: "italic",
    textAlign: "center",
    lineHeight: 22,
  },
  translation: {
    color: "rgba(255, 255, 255, 0.92)",
    fontSize: 15,
    marginBottom: 10,
    textAlign: "left",
    lineHeight: 23,
  },
  sourceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    marginBottom: 4,
  },
  reference: {
    color: "#8EB8E8",
    fontSize: 13,
    fontStyle: "italic",
    flex: 1,
  },
  benefitBox: {
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  benefitLabel: {
    color: "#E8C872",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  benefit: {
    color: "rgba(255, 255, 255, 0.75)",
    fontSize: 14,
    fontStyle: "italic",
    lineHeight: 21,
  },
  emptyWrap: {
    alignItems: "center",
    paddingTop: 48,
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyText: {
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center",
    fontSize: 15,
    lineHeight: 22,
  },
});
