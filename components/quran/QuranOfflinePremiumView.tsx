import React from "react";
import {
  FlatList,
  ImageBackground,
  Pressable,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { EdgeInsets, SafeAreaView } from "react-native-safe-area-context";
import { MCIcon } from "@/components/icons/AppVectorIcons";
import {
  OfflineNavigationTabs,
  OfflineTabType,
} from "../OfflineNavigationTabs";
import { PremiumContent } from "../../utils/premiumContent";
import { quranScreenStyles as styles } from "../../styles/QuranScreen.styles";
import { QuranDownloadedAudioList } from "./QuranDownloadedAudioList";
import {
  QuranSouratePickerModal,
  SourateModalRow,
} from "./QuranSouratePickerModal";

type QuranOfflinePremiumViewProps = {
  insets: EdgeInsets;
  activeOfflineTab: OfflineTabType;
  onTabChange: (tab: OfflineTabType) => void;
  selectedSourateLabel: string;
  onOpenSouratePicker: () => void;
  filteredVerses: unknown[];
  selectedSourate: number;
  versesFlatListRef: React.RefObject<FlatList | null>;
  renderOfflineVerseItem: (info: {
    item: unknown;
  }) => React.ReactElement | null;
  scannedQuranFiles: PremiumContent[];
  renderOfflineTabReciterGroup: (info: {
    item: [string, PremiumContent[]];
  }) => React.ReactElement | null;
  sourateModalVisible: boolean;
  onCloseSourateModal: () => void;
  sourateModalData: SourateModalRow[];
  renderSourateModalItem: (info: {
    item: SourateModalRow;
  }) => React.ReactElement | null;
  windowHeight: number;
};

export function QuranOfflinePremiumView({
  insets,
  activeOfflineTab,
  onTabChange,
  selectedSourateLabel,
  onOpenSouratePicker,
  filteredVerses,
  selectedSourate,
  versesFlatListRef,
  renderOfflineVerseItem,
  scannedQuranFiles,
  renderOfflineTabReciterGroup,
  sourateModalVisible,
  onCloseSourateModal,
  sourateModalData,
  renderSourateModalItem,
  windowHeight,
}: QuranOfflinePremiumViewProps) {
  const { t } = useTranslation();

  return (
    <ImageBackground
      source={require("../../assets/images/parchment_bg.jpg")}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
          <OfflineNavigationTabs
            activeTab={activeOfflineTab}
            onTabChange={onTabChange}
            isPremium={true}
          />
          {activeOfflineTab === "quran" ? (
            <View style={{ flex: 1 }}>
              <View style={styles.compactHeaderOffline}>
                <Pressable
                  style={[styles.compactSourateSelector, { flex: 1 }]}
                  onPress={onOpenSouratePicker}
                >
                  <Text style={styles.compactSourateText}>
                    {selectedSourateLabel}
                  </Text>
                  <MCIcon name="chevron-down" size={20} color="#4ECDC4" />
                </Pressable>
              </View>
              <FlatList
                ref={versesFlatListRef}
                key={`quran-verses-${selectedSourate}`}
                data={filteredVerses}
                keyExtractor={(item: { verse_key?: string; id?: number }) =>
                  `${selectedSourate}-${item.verse_key || item.id}`
                }
                renderItem={renderOfflineVerseItem}
                initialNumToRender={5}
                maxToRenderPerBatch={5}
                windowSize={10}
                removeClippedSubviews={true}
                updateCellsBatchingPeriod={100}
                contentContainerStyle={[
                  styles.versesContainer,
                  { paddingBottom: 100 },
                ]}
              />
            </View>
          ) : (
            <View style={styles.offlineRecitationsContainer}>
              <Text style={styles.offlineRecitationsTitle}>
                {t("downloaded_audio") || "Audio Téléchargés"}
              </Text>
              <QuranDownloadedAudioList
                downloadedRecitations={scannedQuranFiles}
                renderReciterGroup={renderOfflineTabReciterGroup}
              />
            </View>
          )}
        </View>
      </SafeAreaView>

      <QuranSouratePickerModal
        visible={sourateModalVisible}
        onClose={onCloseSourateModal}
        data={sourateModalData}
        renderItem={renderSourateModalItem}
        maxHeight={windowHeight * 0.8}
      />
    </ImageBackground>
  );
}
