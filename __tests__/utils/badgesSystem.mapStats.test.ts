import { mapStatsToBadgeUserStats } from "../../utils/badgesSystem";

describe("mapStatsToBadgeUserStats", () => {
  it("uses all-time quran total for badge progress, not the 30-day window", () => {
    const badgeStats = mapStatsToBadgeUserStats({
      stats: {
        total_quran_verses: 8,
        total_quran_verses_all_time: 24,
        total_dhikr: 8,
        total_dhikr_all_time: 8,
      },
      streaks: { current_streak: 0 },
      history: [
        { date: "2026-06-16", quran: 11, dhikr: 4 },
        { date: "2026-06-15", quran: 6, dhikr: 2 },
      ],
    });

    expect(badgeStats.total_quran_sessions).toBe(24);
    expect(badgeStats.total_dhikr_sessions).toBe(8);
  });
});
