import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  StatusBar,
} from "react-native";
import { LinearGradient } from "@/components/ui/LinearGradientView";
import { IonIcon } from "@/components/icons/AppVectorIcons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import ThemedImageBackground from "../components/ThemedImageBackground";
import {
  useThemeColors,
  useCurrentTheme,
} from "../hooks/useThemeColor";
import { PROPHETS_TIMELINE, PROPHETS_TIMELINE_COUNT } from "../constants/prophetsTimeline";
import { PROPHETS, type ProphetId } from "../constants/prophetStories";

const getHeaderGradient = (
  theme: "light" | "dark" | "morning" | "sunset",
): [string, string] => {
  switch (theme) {
    case "light":
      return ["rgba(248,249,250,0.96)", "rgba(200,230,201,0.88)"];
    case "dark":
      return ["rgba(11,21,32,0.95)", "rgba(21,34,56,0.9)"];
    case "morning":
      return ["rgba(255,250,240,0.96)", "rgba(255,228,181,0.9)"];
    case "sunset":
      return ["rgba(42,31,26,0.95)", "rgba(61,43,34,0.9)"];
    default:
      return ["rgba(248,249,250,0.96)", "rgba(200,230,201,0.88)"];
  }
};

function getProphetConfig(id: ProphetId) {
  return PROPHETS.find((p) => p.id === id);
}

type TimelineItemProps = {
  id: ProphetId;
  order: number;
  isFirst: boolean;
  isLast: boolean;
  colors: ReturnType<typeof useThemeColors>;
  onPress: () => void;
  summary: string;
  viewStoriesLabel: string;
  sealLabel: string;
};

function TimelineItem({
  id,
  order,
  isFirst,
  isLast,
  colors,
  onPress,
  summary,
  viewStoriesLabel,
  sealLabel,
}: TimelineItemProps) {
  const prophet = getProphetConfig(id);
  if (!prophet) return null;

  const isSeal = id === "muhammad";

  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineAxis}>
        {!isFirst && (
          <View style={[styles.connector, { backgroundColor: colors.primary }]} />
        )}
        <View
          style={[
            styles.orderDot,
            {
              backgroundColor: isSeal ? "#FFD700" : colors.primary,
              borderColor: isSeal ? "#FFF8DC" : colors.surface,
            },
          ]}
        >
          <Text style={[styles.orderText, isSeal && styles.orderTextDark]}>
            {order}
          </Text>
        </View>
        {!isLast && (
          <View style={[styles.connector, { backgroundColor: colors.primary }]} />
        )}
      </View>

      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: colors.cardBG,
            borderColor: isSeal ? "#FFD700" : colors.border,
            opacity: pressed ? 0.92 : 1,
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitles}>
            <Text style={[styles.arabicName, { color: colors.primary }]}>
              {prophet.labelArabic}
            </Text>
            <Text style={[styles.prophetName, { color: colors.text }]}>
              {prophet.labelShort}
            </Text>
          </View>
          {isSeal && (
            <View style={styles.sealBadge}>
              <Text style={styles.sealBadgeText}>{sealLabel}</Text>
            </View>
          )}
        </View>

        <Text style={[styles.summary, { color: colors.textSecondary }]}>
          {summary}
        </Text>

        <View style={styles.cardFooter}>
          <Text style={[styles.viewStories, { color: colors.primary }]}>
            {viewStoriesLabel}
          </Text>
          <IonIcon name="chevron-forward" size={16} color={colors.primary} />
        </View>
      </Pressable>
    </View>
  );
}

export default function ProphetsTimelineScreen() {
  const { t } = useTranslation();
  const { push } = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const currentTheme = useCurrentTheme();

  const handleProphetPress = (prophetId: ProphetId) => {
    push({ pathname: "/prophet-stories", params: { prophet: prophetId } });
  };

  return (
    <ThemedImageBackground style={styles.background}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <LinearGradient
          colors={getHeaderGradient(currentTheme)}
          style={styles.header}
        >
          <View style={styles.headerIconWrap}>
            <IonIcon name="git-network-outline" size={28} color={colors.primary} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {t("prophets_timeline.title")}
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              {t("prophets_timeline.subtitle", { count: PROPHETS_TIMELINE_COUNT })}
            </Text>
          </View>
        </LinearGradient>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(100, insets.bottom + 80) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {PROPHETS_TIMELINE.map((entry, index) => (
            <TimelineItem
              key={entry.id}
              id={entry.id}
              order={entry.order}
              isFirst={index === 0}
              isLast={index === PROPHETS_TIMELINE.length - 1}
              colors={colors}
              onPress={() => handleProphetPress(entry.id)}
              summary={t(`prophets_timeline.summaries.${entry.id}`)}
              viewStoriesLabel={t("prophets_timeline.view_stories")}
              sealLabel={t("prophets_timeline.seal_of_prophets")}
            />
          ))}

          <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
            <IonIcon
              name="information-circle-outline"
              size={22}
              color={colors.primary}
            />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              {t("prophets_timeline.info")}
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 14,
  },
  headerIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "stretch",
    marginBottom: 4,
  },
  timelineAxis: {
    width: 36,
    alignItems: "center",
  },
  connector: {
    width: 3,
    flex: 1,
    opacity: 0.5,
    borderRadius: 2,
  },
  orderDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  orderText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "bold",
  },
  orderTextDark: {
    color: "#1A1A1A",
  },
  card: {
    flex: 1,
    marginLeft: 10,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 8,
  },
  cardTitles: {
    flex: 1,
  },
  arabicName: {
    fontSize: 22,
    fontWeight: "600",
    textAlign: "right",
    marginBottom: 2,
  },
  prophetName: {
    fontSize: 16,
    fontWeight: "600",
  },
  sealBadge: {
    backgroundColor: "#FFD700",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sealBadgeText: {
    color: "#1A1A1A",
    fontSize: 10,
    fontWeight: "bold",
  },
  summary: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
  },
  viewStories: {
    fontSize: 13,
    fontWeight: "600",
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderRadius: 12,
    marginTop: 8,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
});
