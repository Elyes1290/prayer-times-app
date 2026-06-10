import React, { useCallback, useRef, useState } from "react";
import { Image } from "expo-image";
import { ImageSourcePropType, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import Animated, {
  interpolateColor,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import kaabaImg from "../../assets/images/kaaba.png";
import { useCompassHeading } from "../../hooks/useCompassHeading";
import { isAlignedWithQiblaWorklet } from "../../utils/compassHeading";

type QiblaCompassViewProps = {
  compassSize: number;
  needleHeight: number;
  compassImage: ImageSourcePropType;
  qiblaBearingDeg: number | null;
  geoCoords: { latitude: number; longitude: number } | null;
  sensorEnabled: boolean;
  primaryColor: string;
  successColor: string;
  overlayTextColor: string;
  onAlignedChange?: (aligned: boolean) => void;
};

function getPointOnCircle(
  centerX: number,
  centerY: number,
  radius: number,
  angleDeg: number,
): { x: number; y: number } {
  const angleRad = (angleDeg - 90) * (Math.PI / 180);
  return {
    x: centerX + radius * Math.cos(angleRad),
    y: centerY + radius * Math.sin(angleRad),
  };
}

export function QiblaCompassView({
  compassSize,
  needleHeight,
  compassImage,
  qiblaBearingDeg,
  geoCoords,
  sensorEnabled,
  primaryColor,
  successColor,
  overlayTextColor,
  onAlignedChange,
}: QiblaCompassViewProps) {
  const { t } = useTranslation();
  const { dialRotation, deviceHeading, needsCalibration, magneticInterference, isActive } =
    useCompassHeading(sensorEnabled, geoCoords);

  const [displayHeading, setDisplayHeading] = useState<number | null>(null);
  const [displayOffset, setDisplayOffset] = useState<number | null>(null);

  const needleColorAnimation = useSharedValue(0);
  const lastAlignedRef = useRef<boolean | null>(null);
  const qiblaBearingShared = useSharedValue(qiblaBearingDeg ?? -1);

  qiblaBearingShared.value = qiblaBearingDeg ?? -1;

  const notifyAligned = useCallback(
    (aligned: boolean) => {
      if (lastAlignedRef.current === aligned) {
        return;
      }
      lastAlignedRef.current = aligned;
      onAlignedChange?.(aligned);
      needleColorAnimation.value = withTiming(aligned ? 1 : 0, { duration: 300 });
    },
    [needleColorAnimation, onAlignedChange],
  );

  useAnimatedReaction(
    () => {
      const heading = deviceHeading.value;
      const qibla = qiblaBearingShared.value;
      if (heading === null || qibla < 0) {
        return null;
      }
      return isAlignedWithQiblaWorklet(heading, qibla);
    },
    (aligned) => {
      if (aligned === null) {
        return;
      }
      runOnJS(notifyAligned)(aligned);
    },
  );

  useAnimatedReaction(
    () => {
      const heading = deviceHeading.value;
      const qibla = qiblaBearingShared.value;
      if (heading === null || qibla < 0) {
        return null;
      }
      const from = ((heading % 360) + 360) % 360;
      const to = ((qibla % 360) + 360) % 360;
      const offset = Math.abs(((to - from + 540) % 360) - 180);
      return { heading: from, offset };
    },
    (info) => {
      if (info === null) {
        runOnJS(setDisplayHeading)(null);
        runOnJS(setDisplayOffset)(null);
        return;
      }
      runOnJS(setDisplayHeading)(info.heading);
      runOnJS(setDisplayOffset)(info.offset);
    },
  );

  const compassAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${dialRotation.value}deg` }],
  }));

  const needleColorAnimatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      needleColorAnimation.value,
      [0, 1],
      [primaryColor, successColor],
    ),
  }));

  const radius = compassSize / 2;
  const kaabaRadius = radius - 30;
  let kaabaPos = { x: radius, y: 30 };
  if (qiblaBearingDeg !== null) {
    kaabaPos = getPointOnCircle(radius, radius, kaabaRadius, qiblaBearingDeg);
  }

  return (
    <View style={styles.wrapper} testID="qibla-compass">
      <View
        style={[
          styles.compassRing,
          {
            width: compassSize,
            height: compassSize,
            borderRadius: radius,
            borderColor: primaryColor,
          },
        ]}
      >
      <Animated.View
        style={[
          styles.compassContainer,
          {
            width: compassSize,
            height: compassSize,
            borderRadius: radius,
          },
          compassAnimatedStyle,
        ]}
      >
        <Image
          source={compassImage}
          style={{
            width: compassSize,
            height: compassSize,
            borderRadius: radius,
          }}
          contentFit="contain"
        />
        {qiblaBearingDeg !== null && (
          <Image
            source={kaabaImg}
            style={[
              styles.kaaba,
              {
                width: compassSize / 8,
                height: compassSize / 8,
                left: kaabaPos.x - compassSize / 16,
                top: kaabaPos.y - compassSize / 16,
              },
            ]}
          />
        )}
      </Animated.View>

      <Animated.View
        style={[
          styles.needle,
          {
            left: compassSize / 2 - 2,
            top: compassSize / 2 - needleHeight,
            height: needleHeight,
          },
        ]}
        pointerEvents="none"
      >
        <Animated.View
          style={[
            styles.needleBar,
            { height: needleHeight },
            needleColorAnimatedStyle,
          ]}
        />
      </Animated.View>
      </View>

      {isActive && qiblaBearingDeg !== null && displayHeading !== null && (
        <View style={styles.debugBox}>
          <Text style={[styles.debugLine, { color: overlayTextColor }]}>
            Qibla : {Math.round(qiblaBearingDeg)}°
          </Text>
          <Text style={[styles.debugLine, { color: overlayTextColor }]}>
            Direction téléphone : {Math.round(displayHeading)}°
          </Text>
          <Text style={[styles.debugLine, { color: primaryColor }]}>
            Écart : {Math.round(displayOffset ?? 0)}°
          </Text>
          {magneticInterference && (
            <Text style={[styles.calibrateHint, { color: primaryColor }]}>
              {t(
                "qibla_magnetic_interference",
                "Interférences magnétiques : éloignez le téléphone des appareils électroniques, métaux et aimants.",
              )}
            </Text>
          )}
          {needsCalibration && !magneticInterference && (
            <Text style={[styles.calibrateHint, { color: primaryColor }]}>
              {t(
                "qibla_calibrate_hint",
                "Bougez le téléphone en forme de 8 pour calibrer la boussole",
              )}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    width: "100%",
  },
  compassRing: {
    position: "relative",
    backgroundColor: "rgba(34,40,58,0.30)",
    borderWidth: 2,
    overflow: "hidden",
  },
  debugBox: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(34,40,58,0.55)",
    alignSelf: "stretch",
    maxWidth: 320,
  },
  debugLine: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    marginVertical: 1,
  },
  calibrateHint: {
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 15,
    marginTop: 4,
  },
  compassContainer: {
    position: "absolute",
    left: 0,
    top: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  kaaba: {
    position: "absolute",
    zIndex: 5,
  },
  needle: {
    position: "absolute",
    width: 4,
    alignItems: "center",
    justifyContent: "flex-start",
    zIndex: 2,
  },
  needleBar: {
    width: 4,
    borderRadius: 2,
  },
});
