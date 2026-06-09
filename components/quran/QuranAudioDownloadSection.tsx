import React from "react";
import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { MCIcon } from "@/components/icons/AppVectorIcons";
import { quranScreenStyles as styles } from "../../styles/QuranScreen.styles";
import { PremiumContent } from "../../utils/premiumContent";
import { QuranDownloadProgressBar } from "./QuranAudioControls";

type DownloadStateEntry = {
  isDownloading: boolean;
  progress: number;
};

type QuranAudioDownloadSectionProps = {
  currentRecitation: PremiumContent;
  downloadState: Map<string, DownloadStateEntry>;
  modalButtonColor: string;
  onCancelDownload: (contentId: string) => void;
  onDownloadRecitation: (recitation: PremiumContent) => void;
  onDeleteRecitation: (recitation: PremiumContent) => void;
};

export function QuranAudioDownloadSection({
  currentRecitation,
  downloadState,
  modalButtonColor,
  onCancelDownload,
  onDownloadRecitation,
  onDeleteRecitation,
}: QuranAudioDownloadSectionProps) {
  const { t } = useTranslation();
  const downloadingState = downloadState.get(currentRecitation.id);
  const isDownloading = downloadingState?.isDownloading || false;
  const progress = downloadingState?.progress || 0;

  if (isDownloading) {
    return (
      <QuranDownloadProgressBar
        progress={progress}
        onCancel={() => onCancelDownload(currentRecitation.id)}
      />
    );
  }

  if (!currentRecitation.isDownloaded) {
    return (
      <Pressable
        style={styles.audioDownloadButton}
        onPress={() => onDownloadRecitation(currentRecitation)}
      >
        <MCIcon name="download" size={20} color={modalButtonColor} />
        <Text style={[styles.audioDownloadText, { color: modalButtonColor }]}>
          {t("download")} ({Number(currentRecitation.fileSize).toFixed(2)}MB)
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.downloadedInfoContainer}>
      <MCIcon name="check-circle" size={20} color="#4CAF50" />
      <Text style={styles.downloadedInfoText}>{t("downloaded_locally")}</Text>
      <Pressable
        style={styles.audioDeleteButton}
        onPress={() => onDeleteRecitation(currentRecitation)}
      >
        <MCIcon name="delete" size={16} color="#FF6B6B" />
      </Pressable>
    </View>
  );
}
