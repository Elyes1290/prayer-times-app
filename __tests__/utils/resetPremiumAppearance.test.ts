import {
  needsPremiumAppearanceReset,
  resolveFreeAdhanSound,
  resolveFreeBackgroundImageType,
  resolveFreeThemeMode,
  isPremiumAdhanSound,
} from "../../utils/resetPremiumAppearance";

describe("resetPremiumAppearance", () => {
  it("keeps free theme modes unchanged", () => {
    expect(resolveFreeThemeMode("light")).toBe("light");
    expect(resolveFreeThemeMode("dark")).toBe("dark");
    expect(resolveFreeThemeMode("auto")).toBe("auto");
  });

  it("maps premium themes to free equivalents", () => {
    expect(resolveFreeThemeMode("morning")).toBe("light");
    expect(resolveFreeThemeMode("sunset")).toBe("dark");
  });

  it("resets premium backgrounds to prophet mosque", () => {
    expect(resolveFreeBackgroundImageType("makka")).toBe("prophet");
    expect(resolveFreeBackgroundImageType("alquds")).toBe("prophet");
    expect(resolveFreeBackgroundImageType("prophet")).toBe("prophet");
  });

  it("detects when a reset is required", () => {
    expect(needsPremiumAppearanceReset("light", "prophet")).toBe(false);
    expect(needsPremiumAppearanceReset("morning", "prophet")).toBe(true);
    expect(needsPremiumAppearanceReset("dark", "makka")).toBe(true);
    expect(needsPremiumAppearanceReset("light", "prophet", "misharyrachid")).toBe(
      false,
    );
    expect(needsPremiumAppearanceReset("light", "prophet", "adhan_custom")).toBe(
      true,
    );
  });

  it("resets premium adhans to the default builtin sound", () => {
    expect(isPremiumAdhanSound("adhan_fajr")).toBe(true);
    expect(isPremiumAdhanSound("misharyrachid")).toBe(false);
    expect(resolveFreeAdhanSound("adhan_fajr")).toBe("misharyrachid");
    expect(resolveFreeAdhanSound("dubai")).toBe("dubai");
  });
});
