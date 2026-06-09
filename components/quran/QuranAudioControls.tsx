import React, { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { PanGestureHandler, State } from "react-native-gesture-handler";
import { useTranslation } from "react-i18next";
import { MCIcon } from "@/components/icons/AppVectorIcons";
import { quranScreenStyles as styles } from "../../styles/QuranScreen.styles";
import { formatAudioTime } from "../../utils/quranTextUtils";

export function QuranDownloadProgressBar({
  progress,
  onCancel,
}: {
  progress: number;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.downloadProgressContainer}>
      <View style={styles.downloadProgressHeader}>
        <Text style={styles.downloadProgressTitle}>
          {t("download_progress")} {Math.round(progress * 100)}%
        </Text>
        <Pressable
          testID="download-cancel-button"
          style={styles.downloadProgressCancelButton}
          onPress={onCancel}
        >
          <MCIcon name="close" size={16} color="#FF6B6B" />
        </Pressable>
      </View>
      <View style={styles.downloadProgressBackground}>
        <View
          style={[styles.downloadProgressFill, { width: `${progress * 100}%` }]}
        />
      </View>
    </View>
  );
}

export function QuranAudioSeekBar({
  currentPosition,
  totalDuration,
  onSeek,
}: {
  currentPosition: number;
  totalDuration: number;
  onSeek: (position: number) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState(0);
  const seekBarWidthRef = useRef(0);

  const displayPosition = isDragging ? dragPosition : currentPosition;
  const displayProgress =
    totalDuration > 0
      ? Math.max(0, Math.min(1, displayPosition / totalDuration))
      : 0;
  const trackReady = totalDuration > 0;

  const positionFromTouchX = (x: number): number | null => {
    const seekBarWidth = seekBarWidthRef.current;
    if (seekBarWidth <= 0 || totalDuration <= 0) {
      return null;
    }
    const clampedX = Math.max(0, Math.min(x, seekBarWidth));
    return (clampedX / seekBarWidth) * totalDuration;
  };

  const onGestureEvent = (event: any) => {
    const { x } = event.nativeEvent;
    if (isDragging) {
      const newPosition = positionFromTouchX(x);
      if (newPosition != null) {
        setDragPosition(newPosition);
      }
    }
  };

  const onPanHandlerStateChange = (event: any) => {
    const { state, x } = event.nativeEvent;

    if (state === State.BEGAN) {
      setIsDragging(true);
      const newPosition = positionFromTouchX(x);
      if (newPosition != null) {
        setDragPosition(newPosition);
      } else {
        setDragPosition(currentPosition);
      }
    } else if (state === State.END || state === State.CANCELLED) {
      if (isDragging) {
        const newPosition = positionFromTouchX(x);
        if (newPosition != null) {
          onSeek(newPosition);
        }
      }
      setIsDragging(false);
    }
  };

  return (
    <View style={styles.seekBarContainer}>
      <View style={styles.seekBarTimeSlot}>
        <Text
          style={[
            styles.audioTimeText,
            isDragging && styles.audioTimeTextActive,
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit={false}
        >
          {formatAudioTime(displayPosition)}
        </Text>
      </View>

      <View style={styles.seekBarWrapper}>
        <PanGestureHandler
          onGestureEvent={onGestureEvent}
          onHandlerStateChange={onPanHandlerStateChange}
          minDist={0}
          enabled={trackReady}
        >
          <View
            style={styles.audioProgressBarTouchTarget}
            onLayout={(event) => {
              seekBarWidthRef.current = event.nativeEvent.layout.width;
            }}
          >
            <View
              pointerEvents="none"
              style={[
                styles.audioProgressBar,
                isDragging && styles.audioProgressBarActive,
              ]}
            >
              {trackReady && (
                <>
                  <View
                    style={[
                      styles.audioProgressFill,
                      {
                        flex: displayProgress > 0 ? displayProgress : 0.001,
                        backgroundColor: isDragging ? "#FF6B6B" : "#4ECDC4",
                      },
                    ]}
                  />
                  <View
                    style={{ flex: Math.max(0.001, 1 - displayProgress) }}
                  />
                </>
              )}
            </View>
          </View>
        </PanGestureHandler>

        {isDragging && (
          <View
            style={[
              styles.seekPreview,
              { left: `${Math.max(10, Math.min(75, displayProgress * 100))}%` },
            ]}
          >
            <Text style={styles.seekPreviewText}>
              {formatAudioTime(displayPosition)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.seekBarTimeSlot}>
        <Text
          style={styles.audioTimeText}
          numberOfLines={1}
          adjustsFontSizeToFit={false}
        >
          {formatAudioTime(totalDuration)}
        </Text>
      </View>
    </View>
  );
}
