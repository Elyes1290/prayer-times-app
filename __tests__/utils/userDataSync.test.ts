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
