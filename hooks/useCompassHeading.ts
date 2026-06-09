import { useCallback, useEffect, useRef, useState } from "react";
import {
  Easing,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { useFocusEffect } from "@react-navigation/native";
import * as Location from "expo-location";
import { AppState, Platform } from "react-native";
import { errorLog } from "../utils/logger";
import {
  addRotationCompassListener,
  isRotationCompassAvailable,
  startRotationCompass,
  stopRotationCompass,
} from "../native/RotationCompass";
import {
  advanceCumulativeDialRotation,
  COMPASS_DIAL_ANIMATION_MS,
  needsCompassCalibration,
  resolveHeadingFromSensor,
} from "../utils/compassHeading";

const DIAL_EASING = Easing.out(Easing.cubic);
const COMPASS_INIT_RETRY_MS = 2000;

export type UseCompassHeadingResult = {
  dialRotation: SharedValue<number>;
  deviceHeading: SharedValue<number | null>;
  accuracy: number | null;
  isActive: boolean;
  needsCalibration: boolean;
  magneticInterference: boolean;
};

export type CompassGeoCoords = {
  latitude: number;
  longitude: number;
};

function restartAndroidCompass(geo: CompassGeoCoords | null) {
  if (!isRotationCompassAvailable()) {
    return;
  }
  stopRotationCompass();
  startRotationCompass(geo?.latitude ?? 0, geo?.longitude ?? 0);
}

/**
 * Android : TYPE_ROTATION_VECTOR natif (SENSOR_DELAY_UI + lissage).
 * iOS : watchHeadingAsync + animation Reanimated 200 ms.
 */
export function useCompassHeading(
  enabled: boolean,
  geo: CompassGeoCoords | null = null,
): UseCompassHeadingResult {
  const dialRotation = useSharedValue(0);
  const deviceHeading = useSharedValue<number | null>(null);

  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [needsCalibrationFlag, setNeedsCalibrationFlag] = useState(false);
  const [magneticInterference, setMagneticInterference] = useState(false);
  const [hasSample, setHasSample] = useState(false);
  const hasSampleRef = useRef(false);

  const trackerRef = useRef({
    lastHeading: null as number | null,
    cumulativeDial: 0,
  });
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);
  const compassSubRef = useRef<{ remove: () => void } | null>(null);
  const geoRef = useRef(geo);
  geoRef.current = geo;

  const applyHeading = useCallback(
    (heading: number, sensorAccuracy: number | null) => {
      const tracker = trackerRef.current;
      const advanced = advanceCumulativeDialRotation(
        tracker.cumulativeDial,
        tracker.lastHeading,
        heading,
      );
      trackerRef.current = {
        cumulativeDial: advanced.cumulativeDial,
        lastHeading: advanced.previousHeading,
      };

      deviceHeading.value = advanced.previousHeading;
      dialRotation.value = withTiming(advanced.cumulativeDial, {
        duration: COMPASS_DIAL_ANIMATION_MS,
        easing: DIAL_EASING,
      });

      if (sensorAccuracy !== null) {
        setAccuracy(sensorAccuracy);
      }
      hasSampleRef.current = true;
      setHasSample(true);
    },
    [dialRotation, deviceHeading],
  );

  const attachAndroidListener = useCallback(() => {
    compassSubRef.current?.remove();
    compassSubRef.current = addRotationCompassListener((event) => {
      applyHeading(event.heading, 2);
      setNeedsCalibrationFlag(event.needsCalibration);
      setMagneticInterference(event.magneticInterference ?? false);
    });
    return compassSubRef.current != null;
  }, [applyHeading]);

  const startAndroidCompass = useCallback(() => {
    if (!isRotationCompassAvailable()) {
      return false;
    }
    restartAndroidCompass(geoRef.current);
    return attachAndroidListener();
  }, [attachAndroidListener]);

  const stopCompass = useCallback(() => {
    compassSubRef.current?.remove();
    compassSubRef.current = null;
    locationSubRef.current?.remove();
    locationSubRef.current = null;
    if (isRotationCompassAvailable()) {
      stopRotationCompass();
    }
    trackerRef.current = { lastHeading: null, cumulativeDial: 0 };
    deviceHeading.value = null;
    dialRotation.value = 0;
    setNeedsCalibrationFlag(false);
    setMagneticInterference(false);
    setAccuracy(null);
    hasSampleRef.current = false;
    setHasSample(false);
  }, [dialRotation, deviceHeading]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    const startIosHeading = async () => {
      try {
        const sub = await Location.watchHeadingAsync(
          (data) => {
            const parsed = resolveHeadingFromSensor(data);
            if (parsed === null) {
              return;
            }
            const acc =
              typeof data.accuracy === "number" ? data.accuracy : null;
            applyHeading(parsed, acc);
          },
          (error) => {
            errorLog("Erreur boussole (watchHeading):", error);
          },
        );
        if (cancelled) {
          sub.remove();
          return;
        }
        locationSubRef.current = sub;
      } catch (error) {
        errorLog("Impossible de démarrer watchHeadingAsync:", error);
      }
    };

    if (Platform.OS === "android") {
      const ok = startAndroidCompass();
      if (!ok) {
        void startIosHeading();
      }
    } else {
      void startIosHeading();
    }

    const retryTimer = setTimeout(() => {
      if (cancelled || Platform.OS !== "android" || hasSampleRef.current) {
        return;
      }
      if (!isRotationCompassAvailable()) {
        return;
      }
      restartAndroidCompass(geoRef.current);
      attachAndroidListener();
    }, COMPASS_INIT_RETRY_MS);

    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      stopCompass();
    };
  }, [
    enabled,
    geo?.latitude,
    geo?.longitude,
    applyHeading,
    startAndroidCompass,
    attachAndroidListener,
    stopCompass,
  ]);

  useFocusEffect(
    useCallback(() => {
      if (!enabled || Platform.OS !== "android") {
        return;
      }
      startAndroidCompass();
    }, [enabled, startAndroidCompass]),
  );

  useEffect(() => {
    if (!enabled || Platform.OS !== "android") {
      return;
    }

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        startAndroidCompass();
      }
    });

    return () => subscription.remove();
  }, [enabled, startAndroidCompass]);

  return {
    dialRotation,
    deviceHeading,
    accuracy: enabled ? accuracy : null,
    isActive: enabled && hasSample,
    needsCalibration: needsCompassCalibration(
      needsCalibrationFlag,
      accuracy ?? undefined,
    ),
    magneticInterference,
  };
}
