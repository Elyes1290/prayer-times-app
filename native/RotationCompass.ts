import {
  NativeEventEmitter,
  NativeModules,
  Platform,
  type EmitterSubscription,
} from "react-native";

export type RotationCompassHeadingEvent = {
  heading: number;
  magneticFieldUt: number;
  needsCalibration: boolean;
  magneticInterference: boolean;
};

type RotationCompassNativeModule = {
  start: (latitude: number, longitude: number) => void;
  stop: () => void;
  addListener: (eventName: string) => void;
  removeListeners: (count: number) => void;
};

const NativeRotationCompass = NativeModules
  .RotationCompassModule as RotationCompassNativeModule | undefined;

const EVENT_HEADING = "RotationCompassHeading";

export function isRotationCompassAvailable(): boolean {
  return Platform.OS === "android" && NativeRotationCompass != null;
}

export function startRotationCompass(
  latitude: number,
  longitude: number,
): void {
  NativeRotationCompass?.start(latitude, longitude);
}

export function stopRotationCompass(): void {
  NativeRotationCompass?.stop();
}

export function addRotationCompassListener(
  listener: (event: RotationCompassHeadingEvent) => void,
): EmitterSubscription | null {
  if (!NativeRotationCompass) {
    return null;
  }
  const emitter = new NativeEventEmitter(NativeRotationCompass);
  return emitter.addListener(EVENT_HEADING, listener);
}
