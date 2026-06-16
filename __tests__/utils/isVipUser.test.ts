import { isVipUserRecord } from "../../utils/isVipUser";

describe("isVipUserRecord", () => {
  it("returns true when is_vip is 1", () => {
    expect(isVipUserRecord({ is_vip: 1 })).toBe(true);
  });

  it("returns false when only subscription_platform is vip", () => {
    expect(
      isVipUserRecord({
        subscription_platform: "vip",
        is_vip: 0,
        premium_expiry: "2099-12-31T23:59:59.000Z",
      }),
    ).toBe(false);
  });
});
