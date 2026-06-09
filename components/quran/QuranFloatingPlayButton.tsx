import React from "react";
import { Pressable } from "react-native";
import { MCIcon } from "@/components/icons/AppVectorIcons";
import { quranScreenStyles as styles } from "../../styles/QuranScreen.styles";
import { PremiumContent } from "../../utils/premiumContent";

type QuranFloatingPlayButtonProps = {
  selectedReciter: string;
  currentRecitation: PremiumContent | null;
  isRecitationPlaying: boolean;
  isLoading: boolean;
  onOpenReciterPicker: () => void;
  onOpenAudioControls: () => void;
};

export function QuranFloatingPlayButton({
  selectedReciter,
  currentRecitation,
  isRecitationPlaying,
  isLoading,
  onOpenReciterPicker,
  onOpenAudioControls,
}: QuranFloatingPlayButtonProps) {
  return (
    <Pressable
      testID="floating-play-button"
      style={[
        styles.floatingPlayButton,
        !selectedReciter && styles.floatingPlayButtonInactive,
      ]}
      onPress={() => {
        if (!selectedReciter) {
          onOpenReciterPicker();
        } else if (currentRecitation) {
          onOpenAudioControls();
        }
      }}
      disabled={isLoading}
    >
      <MCIcon
        name={
          isLoading
            ? "loading"
            : !selectedReciter
              ? "account-music"
              : isRecitationPlaying
                ? "pause"
                : "play"
        }
        size={24}
        color="#fff"
      />
    </Pressable>
  );
}
