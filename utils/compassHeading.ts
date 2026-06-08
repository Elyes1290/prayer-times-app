import type { LocationHeadingObject } from "expo-location";

/** 0–360 */
export function normalizeDegrees(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

/**
 * Capteur device : true north si dispo, sinon nord magnétique.
 */
export function resolveHeadingFromSensor(
  data: LocationHeadingObject,
): number | null {
  const { trueHeading, magHeading } = data;

  if (Number.isFinite(trueHeading) && trueHeading >= 0) {
    return normalizeDegrees(trueHeading);
  }
  if (Number.isFinite(magHeading) && magHeading >= 0) {
    return normalizeDegrees(magHeading);
  }
  return null;
}

/** Plus court chemin entre deux angles (degrés), dans [-180, 180]. */
export function shortestAngleDelta(fromDeg: number, toDeg: number): number {
  return ((toDeg - fromDeg + 540) % 360) - 180;
}

/**
 * Lissage azimut (passage 0°/360°) — même logique que SensorManager + filtre natif.
 */
export function smoothHeading(
  previous: number | null,
  next: number,
  alpha = 0.12,
): number {
  if (previous === null) {
    return normalizeDegrees(next);
  }
  const delta = shortestAngleDelta(previous, next);
  return normalizeDegrees(previous + delta * alpha);
}

/**
 * Rotation cumulée du cadran (aiguille fixe en haut, nord sur le cadran).
 */
export function advanceCumulativeDialRotation(
  cumulativeDial: number,
  previousHeading: number | null,
  newHeading: number,
): { cumulativeDial: number; previousHeading: number } {
  if (previousHeading === null) {
    return {
      cumulativeDial: -normalizeDegrees(newHeading),
      previousHeading: normalizeDegrees(newHeading),
    };
  }
  const delta = shortestAngleDelta(previousHeading, newHeading);
  return {
    cumulativeDial: cumulativeDial - delta,
    previousHeading: normalizeDegrees(newHeading),
  };
}

export function isAlignedWithQibla(
  deviceHeadingDeg: number,
  qiblaBearingDeg: number,
  toleranceDeg = 15,
): boolean {
  const diff = Math.abs(
    shortestAngleDelta(normalizeDegrees(deviceHeadingDeg), qiblaBearingDeg),
  );
  return diff <= toleranceDeg;
}

export function isAlignedWithQiblaWorklet(
  deviceHeadingDeg: number,
  qiblaBearingDeg: number,
  toleranceDeg = 15,
): boolean {
  "worklet";
  const from = ((deviceHeadingDeg % 360) + 360) % 360;
  const to = ((qiblaBearingDeg % 360) + 360) % 360;
  const diff = Math.abs(((to - from + 540) % 360) - 180);
  return diff <= toleranceDeg;
}

export function qiblaOffsetDegrees(
  deviceHeadingDeg: number,
  qiblaBearingDeg: number,
): number {
  return Math.abs(
    shortestAngleDelta(normalizeDegrees(deviceHeadingDeg), qiblaBearingDeg),
  );
}

export function needsCompassCalibration(
  needsCalibrationFlag?: boolean,
  accuracy?: number | null,
): boolean {
  if (needsCalibrationFlag === true) {
    return true;
  }
  return accuracy === undefined || accuracy === null || accuracy < 2;
}

export const COMPASS_DIAL_ANIMATION_MS = 200;
