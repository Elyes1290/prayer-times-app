import {
  toPremiumNativePlaybackUrl,
  toPremiumStreamPlaybackUrl,
} from "../../utils/premiumPlaybackUrl";

describe("premiumPlaybackUrl", () => {
  const download =
    "https://myadhanapp.com/api/recitations.php?action=download&reciter=X&surah=001";

  it("toPremiumStreamPlaybackUrl convertit download en stream", () => {
    expect(toPremiumStreamPlaybackUrl(download)).toContain("action=stream");
    expect(toPremiumStreamPlaybackUrl(download)).not.toContain("action=download");
  });

  it("toPremiumNativePlaybackUrl est un alias stream", () => {
    expect(toPremiumNativePlaybackUrl(download)).toBe(
      toPremiumStreamPlaybackUrl(download),
    );
  });

  it("laisse les chemins locaux inchangés", () => {
    expect(toPremiumStreamPlaybackUrl("file:///data/001.mp3")).toBe(
      "file:///data/001.mp3",
    );
  });
});
