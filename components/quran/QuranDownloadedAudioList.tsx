import React, { useMemo } from "react";
import { FlatList, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { MCIcon } from "@/components/icons/AppVectorIcons";
import { PremiumContent } from "../../utils/premiumContent";
import { quranScreenStyles as styles } from "../../styles/QuranScreen.styles";

type ReciterGroupItem = [string, PremiumContent[]];

type QuranDownloadedAudioListProps = {
  downloadedRecitations: PremiumContent[];
  renderReciterGroup: (info: {
    item: ReciterGroupItem;
  }) => React.ReactElement | null;
  listPaddingBottom?: number;
};

export function QuranDownloadedAudioList({
  downloadedRecitations,
  renderReciterGroup,
  listPaddingBottom,
}: QuranDownloadedAudioListProps) {
  const { t } = useTranslation();

  const recitationsByReciter = useMemo(() => {
    const groups: Record<string, PremiumContent[]> = {};
    downloadedRecitations.forEach((rec) => {
      const reciterName =
        rec.reciter || t("unknown_reciter") || "Récitateur inconnu";
      if (!groups[reciterName]) {
        groups[reciterName] = [];
      }
      groups[reciterName].push(rec);
    });
    return groups;
  }, [downloadedRecitations, t]);

  if (downloadedRecitations.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <MCIcon
          name="download-outline"
          size={64}
          color="#ba9c34"
          style={{ opacity: 0.5, marginBottom: 16 }}
        />
        <Text style={styles.placeholderText}>
          {t("no_downloaded_audio") ||
            "Aucun audio téléchargé pour le moment"}
        </Text>
        <Text
          style={[styles.placeholderText, { fontSize: 12, marginTop: 8 }]}
        >
          {t("download_audio_hint") ||
            "Téléchargez des récitations en mode en ligne"}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={Object.entries(recitationsByReciter)}
      keyExtractor={([reciterName]) => reciterName}
      renderItem={renderReciterGroup}
      contentContainerStyle={[
        styles.offlineRecitationsList,
        listPaddingBottom != null ? { paddingBottom: listPaddingBottom } : null,
      ]}
    />
  );
}
