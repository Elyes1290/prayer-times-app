import {
  areAdhanSoundListsEqual,
  arePremiumSoundTitlesEqual,
  canonicalAdhanContentId,
  dedupeDownloadedAdhanRows,
  mergeAvailableAdhanSounds,
} from "../../utils/adhanSoundList";

describe("adhanSoundList", () => {
  it("canonicalise les IDs avec ou sans préfixe adhan_", () => {
    expect(canonicalAdhanContentId("ibrahim_al_arkani")).toBe(
      "adhan_ibrahim_al_arkani"
    );
    expect(canonicalAdhanContentId("adhan_ibrahim_al_arkani")).toBe(
      "adhan_ibrahim_al_arkani"
    );
  });

  it("dédoublonne les variantes AsyncStorage pointant vers le même fichier", () => {
    const path = "/data/adhan_ibrahim.mp3";
    const rows = dedupeDownloadedAdhanRows([
      {
        contentId: "adhan_ibrahim",
        title: "Ibrahim A",
        downloadPath: path,
      },
      {
        contentId: "ibrahim",
        title: "Ibrahim B",
        downloadPath: path,
      },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].contentId).toBe("adhan_ibrahim");
  });

  it("fusionne les sons builtin et premium sans doublon", () => {
    const { sounds, titles } = mergeAvailableAdhanSounds(
      ["misharyrachid"],
      [
        {
          contentId: "adhan_custom",
          title: "Custom Adhan",
          downloadPath: "/x/custom.mp3",
        },
        {
          contentId: "custom",
          title: "Custom Duplicate",
          downloadPath: "/x/custom.mp3",
        },
      ]
    );
    expect(sounds).toEqual(["misharyrachid", "adhan_custom"]);
    expect(titles.adhan_custom).toBe("Custom Adhan");
  });

  it("détecte les listes de sons identiques", () => {
    expect(
      areAdhanSoundListsEqual(["misharyrachid", "adhan_a"], ["misharyrachid", "adhan_a"])
    ).toBe(true);
    expect(
      areAdhanSoundListsEqual(["misharyrachid"], ["misharyrachid", "adhan_a"])
    ).toBe(false);
  });

  it("détecte les titres premium identiques", () => {
    expect(arePremiumSoundTitlesEqual({ a: "1" }, { a: "1" })).toBe(true);
    expect(arePremiumSoundTitlesEqual({ a: "1" }, { a: "2" })).toBe(false);
  });
});
