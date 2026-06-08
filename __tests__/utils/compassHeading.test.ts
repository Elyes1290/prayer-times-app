import {
  resolveHeadingFromSensor,
  smoothHeading,
  advanceCumulativeDialRotation,
  isAlignedWithQibla,
  normalizeDegrees,
  shortestAngleDelta,
  qiblaOffsetDegrees,
} from "../../utils/compassHeading";

describe("compassHeading", () => {
  it("utilise magHeading quand trueHeading vaut -1 (Android)", () => {
    const result = resolveHeadingFromSensor({
      trueHeading: -1,
      magHeading: 127,
      accuracy: 2,
    });
    expect(result).toBe(127);
  });

  it("préfère trueHeading quand disponible", () => {
    const result = resolveHeadingFromSensor({
      trueHeading: 45,
      magHeading: 50,
      accuracy: 3,
    });
    expect(result).toBe(45);
  });

  it("lisse le passage 0/360", () => {
    const a = smoothHeading(359, 1, 1);
    expect(a).toBe(1);
  });

  it("rotation cumulée sans saut à 360°", () => {
    let cumulative = 0;
    let prev: number | null = null;
    const steps = [350, 355, 0, 5, 10];
    for (const h of steps) {
      const r = advanceCumulativeDialRotation(cumulative, prev, h);
      cumulative = r.cumulativeDial;
      prev = r.previousHeading;
    }
    expect(Math.abs(cumulative)).toBeLessThan(720);
    expect(cumulative).toBeLessThan(0);
  });

  it("détecte l'alignement Qibla", () => {
    expect(isAlignedWithQibla(100, 105, 15)).toBe(true);
    expect(isAlignedWithQibla(100, 200, 15)).toBe(false);
  });

  it("calcule l'écart Qibla", () => {
    expect(qiblaOffsetDegrees(100, 105)).toBe(5);
    expect(qiblaOffsetDegrees(350, 10)).toBe(20);
  });

  it("normalise les degrés", () => {
    expect(normalizeDegrees(-10)).toBe(350);
    expect(normalizeDegrees(370)).toBe(10);
  });

  it("calcule le plus court delta", () => {
    expect(shortestAngleDelta(350, 10)).toBe(20);
    expect(shortestAngleDelta(10, 350)).toBe(-20);
  });
});
