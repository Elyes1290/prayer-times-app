// components/ramadan/RamadanRecapCard.tsx
// Bilan de fin de Ramadan (premium) : aperçu de l'image et partage.
// L'image ne contient que des éléments positifs (voir `utils/ramadan/recap.ts`).

import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Sharing from "expo-sharing";
import { captureRef } from "react-native-view-shot";
import { MCIcon } from "@/components/icons/AppVectorIcons";
import { useThemeColors } from "../../hooks/useThemeColor";
import type { RamadanTranslate } from "../../utils/ramadan/i18n";
import { hasRecapContent, type RamadanRecap } from "../../utils/ramadan/recap";
import { RamadanButton, RamadanCard } from "./RamadanUI";

interface RamadanRecapCardProps {
  recap: RamadanRecap;
  t: RamadanTranslate;
}

// L'image est rendue à taille fixe (ratio 2:3) puis exportée en haute résolution :
// son rendu ne dépend donc ni du thème ni de la taille de l'écran.
const IMAGE_WIDTH = 320;
const IMAGE_HEIGHT = 480;
const EXPORT_WIDTH = 960;
const EXPORT_HEIGHT = 1440;

const IMAGE_BG = "#0F3D2E";
const IMAGE_GOLD = "#D4AF37";
const IMAGE_TEXT = "#FFFFFF";
const IMAGE_MUTED = "rgba(255,255,255,0.75)";

interface RecapStat {
  key: string;
  icon: string;
  value: string;
  label: string;
}

export function buildRecapStats(recap: RamadanRecap, t: RamadanTranslate): RecapStat[] {
  const stats: RecapStat[] = [];
  if (recap.fastedDays > 0) {
    stats.push({
      key: "fasted",
      icon: "weather-sunset",
      value: `${recap.fastedDays}/${recap.totalDays}`,
      label: t("recap.fasted"),
    });
  }
  if (recap.bestStreak > 1) {
    stats.push({
      key: "streak",
      icon: "fire",
      value: String(recap.bestStreak),
      label: t("recap.streak"),
    });
  }
  if (recap.tarawihNights > 0) {
    stats.push({
      key: "tarawih",
      icon: "weather-night",
      value: String(recap.tarawihNights),
      label: t("recap.tarawih"),
    });
  }
  if (recap.sadaqaDays > 0) {
    stats.push({
      key: "sadaqa",
      icon: "hand-heart",
      value: String(recap.sadaqaDays),
      label: t("recap.sadaqa"),
    });
  }
  if (recap.khatmJuzTotal > 0 && recap.khatmJuzDone > 0) {
    stats.push({
      key: "khatm",
      icon: "book-open-page-variant",
      value: `${Math.min(recap.khatmJuzDone, recap.khatmJuzTotal)}/${recap.khatmJuzTotal}`,
      label: t("recap.khatm"),
    });
  }
  return stats;
}

export function buildRecapMessage(recap: RamadanRecap, t: RamadanTranslate): string {
  return t("recap.message", {
    year: recap.hijriYear,
    fasted: recap.fastedDays,
    total: recap.totalDays,
    tarawih: recap.tarawihNights,
    sadaqa: recap.sadaqaDays,
  });
}

/** Image exportée : couleurs fixes, indépendantes du thème de l'application. */
export const RecapImage = React.forwardRef<View, RamadanRecapCardProps>(
  function RecapImage({ recap, t }, ref) {
    const stats = buildRecapStats(recap, t);
    return (
      <View ref={ref} collapsable={false} style={styles.image}>
        <View style={styles.imageInner}>
          <MCIcon name="moon-waning-crescent" size={44} color={IMAGE_GOLD} />
          <Text style={styles.imageTitle}>{t("recap.imageTitle", { year: recap.hijriYear })}</Text>
          <Text style={styles.imageSubtitle}>{t("recap.imageSubtitle")}</Text>

          <View style={styles.statsGrid}>
            {stats.map((stat) => (
              <View key={stat.key} style={styles.statTile}>
                <MCIcon name={stat.icon as never} size={22} color={IMAGE_GOLD} />
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel} numberOfLines={2}>
                  {stat.label}
                </Text>
              </View>
            ))}
          </View>

          {recap.unlockedBadges.length > 0 ? (
            <View style={styles.badgesBlock}>
              <Text style={styles.badgesLabel}>{t("recap.badges")}</Text>
              <View style={styles.badgesRow}>
                {recap.unlockedBadges.map((badge) => (
                  <View
                    key={badge.code}
                    style={[styles.badgeCircle, { backgroundColor: badge.color }]}
                  >
                    <MCIcon name={badge.icon as never} size={18} color="#FFFFFF" />
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <Text style={styles.footer}>{t("recap.imageFooter")}</Text>
        </View>
      </View>
    );
  },
);

export default function RamadanRecapCard({ recap, t }: RamadanRecapCardProps) {
  const colors = useThemeColors();
  const imageRef = useRef<View>(null);
  const [open, setOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState(false);

  const hasContent = hasRecapContent(recap);

  const handleShare = useCallback(async () => {
    if (sharing) return;
    setSharing(true);
    setError(false);
    try {
      const uri = await captureRef(imageRef, {
        format: "png",
        quality: 1,
        result: "tmpfile",
        width: EXPORT_WIDTH,
        height: EXPORT_HEIGHT,
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "image/png",
          dialogTitle: t("recap.share"),
        });
      } else {
        // Plateforme sans partage de fichier : on partage au moins le texte.
        await Share.share({ message: buildRecapMessage(recap, t) });
      }
    } catch (shareError) {
      console.warn("⚠️ [Ramadan] Partage du bilan impossible:", shareError);
      setError(true);
    } finally {
      setSharing(false);
    }
  }, [recap, sharing, t]);

  const handleClose = useCallback(() => {
    setOpen(false);
    setError(false);
  }, []);

  return (
    <RamadanCard title={t("recap.title")} icon="share-variant" premiumBadge>
      <Text style={[styles.hint, { color: colors.textSecondary }]}>
        {hasContent ? t("recap.hint") : t("recap.empty")}
      </Text>
      {hasContent ? (
        <RamadanButton label={t("recap.share")} icon="image-outline" onPress={() => setOpen(true)} />
      ) : null}

      <Modal
        visible={open}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={handleClose}
      >
        <View style={styles.overlay}>
          <ScrollView
            contentContainerStyle={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            <RecapImage ref={imageRef} recap={recap} t={t} />

            {error ? (
              <Text style={styles.errorText} accessibilityRole="alert">
                {t("recap.shareError")}
              </Text>
            ) : null}

            <View style={styles.actions}>
              {sharing ? (
                <View style={styles.sharingRow}>
                  <ActivityIndicator color={IMAGE_GOLD} />
                  <Text style={styles.sharingText}>{t("recap.preparing")}</Text>
                </View>
              ) : (
                <RamadanButton
                  label={t("recap.shareAction")}
                  icon="share-variant"
                  onPress={() => void handleShare()}
                />
              )}
              <Pressable
                onPress={handleClose}
                accessibilityRole="button"
                accessibilityLabel={t("recap.close")}
                style={styles.closeButton}
              >
                <Text style={styles.closeText}>{t("recap.close")}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </RamadanCard>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: 13, lineHeight: 18, marginBottom: 12 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)" },
  modalContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 16,
    gap: 16,
  },
  image: {
    width: IMAGE_WIDTH,
    height: IMAGE_HEIGHT,
    backgroundColor: IMAGE_BG,
    borderRadius: 20,
    padding: 10,
  },
  imageInner: {
    flex: 1,
    borderWidth: 2,
    borderColor: IMAGE_GOLD,
    borderRadius: 14,
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 14,
    gap: 6,
  },
  imageTitle: {
    color: IMAGE_TEXT,
    fontSize: 24,
    lineHeight: 36,
    fontWeight: "800",
    textAlign: "center",
  },
  imageSubtitle: {
    color: IMAGE_MUTED,
    fontSize: 13,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 8,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    alignSelf: "stretch",
  },
  statTile: {
    width: "48%",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    gap: 2,
  },
  statValue: { color: IMAGE_TEXT, fontSize: 22, lineHeight: 30, fontWeight: "800" },
  statLabel: { color: IMAGE_MUTED, fontSize: 12, lineHeight: 20, textAlign: "center" },
  badgesBlock: { alignItems: "center", marginTop: 10, gap: 6, alignSelf: "stretch" },
  badgesLabel: { color: IMAGE_GOLD, fontSize: 13, lineHeight: 22, fontWeight: "700" },
  badgesRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6 },
  badgeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    marginTop: "auto",
    color: IMAGE_GOLD,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "700",
    letterSpacing: 1,
  },
  actions: { width: IMAGE_WIDTH, gap: 8 },
  sharingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    minHeight: 46,
  },
  sharingText: { color: IMAGE_TEXT, fontSize: 15 },
  closeButton: { alignItems: "center", paddingVertical: 12 },
  closeText: { color: IMAGE_TEXT, fontSize: 15, fontWeight: "600" },
  errorText: { color: "#FF8A80", fontSize: 13, textAlign: "center" },
});
