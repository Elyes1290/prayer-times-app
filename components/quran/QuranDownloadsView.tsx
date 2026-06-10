import React from "react";
import { Pressable, Text, View } from "react-native";
import CachedImageBackground from "../CachedImageBackground";
import { useTranslation } from "react-i18next";
import { EdgeInsets, SafeAreaView } from "react-native-safe-area-context";
import { MCIcon } from "@/components/icons/AppVectorIcons";
import { PremiumContent } from "../../utils/premiumContent";
import { quranScreenStyles as styles } from "../../styles/QuranScreen.styles";
import { QuranDownloadedAudioList } from "./QuranDownloadedAudioList";

type QuranDownloadsViewProps = {
  insets: EdgeInsets;
  scannedQuranFiles: PremiumContent[];
  onBack: () => void;
  renderDownloadsReciterGroup: (info: {
    item: [string, PremiumContent[]];
  }) => React.ReactElement | null;
};

export function QuranDownloadsView({
  insets,
  scannedQuranFiles,
  onBack,
  renderDownloadsReciterGroup,
}: QuranDownloadsViewProps) {
  const { t } = useTranslation();

  return (
    <CachedImageBackground
      source={require("../../assets/images/parchment_bg.jpg")}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
          <View style={{ marginBottom: 16, paddingHorizontal: 16 }}>
            <Pressable
              onPress={onBack}
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 8,
              }}
            >
              <MCIcon name="arrow-left" size={24} color="#ba9c34" />
              <Text
                style={[
                  styles.sourateName,
                  { marginLeft: 8, fontSize: 20, fontWeight: "bold" },
                ]}
              >
                {t("manage_downloads") || "Gérer les téléchargements"}
              </Text>
            </Pressable>
          </View>

          <View style={styles.offlineRecitationsContainer}>
            <Text style={styles.offlineRecitationsTitle}>
              {t("downloaded_audio") || "Audio Téléchargés"}
            </Text>
            <QuranDownloadedAudioList
              downloadedRecitations={scannedQuranFiles}
              renderReciterGroup={renderDownloadsReciterGroup}
              listPaddingBottom={100}
            />
          </View>
        </View>
      </SafeAreaView>
    </CachedImageBackground>
  );
}
