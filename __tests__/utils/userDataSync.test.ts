import {
  getDaysPastExpiry,
  isPremiumActiveOnServer,
  isWithinPremiumGracePeriod,
  PREMIUM_GRACE_PERIOD_DAYS,
} from "../../utils/userDataSync";

describe("userDataSync grace period", () => {
  it("considers premium active on server during grace period", () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

    expect(
      isPremiumActiveOnServer({
        premium_status: 1,
        premium_expiry: twoDaysAgo,
      }),
    ).toBe(true);
  });

  it("considers premium inactive after grace period", () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();

    expect(
      isPremiumActiveOnServer({
        premium_status: 1,
        premium_expiry: fiveDaysAgo,
      }),
    ).toBe(false);
  });

  it("tracks days past expiry within configured grace window", () => {
    const expiry = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    expect(getDaysPastExpiry(expiry)).toBe(2);
    expect(isWithinPremiumGracePeriod(expiry)).toBe(true);
    expect(PREMIUM_GRACE_PERIOD_DAYS).toBe(3);
  });
});

describe("normalizeStoredUserData", () => {
  it("clears stale VIP when Apple subscription markers are present", () => {
    const { normalizeStoredUserData, isPlaceholderVipExpiry } = require("../../utils/userDataSync");

    const normalized = normalizeStoredUserData({
      id: 44,
      user_id: 44,
      email: "nllelyes700@gmail.com",
      user_first_name: "Test",
      premium_status: 1,
      is_vip: 1,
      subscription_platform: "apple",
      subscription_type: "monthly",
      subscription_id: "2000001102688437",
      premium_expiry: "2099-12-31T23:59:59.000Z",
      language: "fr",
      last_sync: new Date().toISOString(),
    });

    expect(normalized.is_vip).toBe(false);
    expect(normalized.premium_expiry).toBeUndefined();
    expect(isPlaceholderVipExpiry("2099-12-31T23:59:59.000Z")).toBe(true);
  });

  it("keeps real VIP records untouched", () => {
    const { normalizeStoredUserData } = require("../../utils/userDataSync");

    const vip = {
      id: 1,
      user_id: 1,
      email: "vip@example.com",
      user_first_name: "VIP",
      premium_status: 1,
      is_vip: 1,
      subscription_platform: "vip",
      premium_expiry: "2099-12-31T23:59:59.000Z",
      language: "fr",
      last_sync: new Date().toISOString(),
    };

    expect(normalizeStoredUserData(vip)).toEqual(vip);
  });
});
