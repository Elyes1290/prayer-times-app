import {
  formatGeocodeLabel,
  getCachedAutoLocationCity,
} from "../../utils/locationDisplay";

describe("locationDisplay", () => {
  it("formatGeocodeLabel combine ville et pays", () => {
    expect(
      formatGeocodeLabel({
        city: "Paris",
        country: "France",
      } as never),
    ).toBe("Paris, France");
  });

  it("getCachedAutoLocationCity retourne la ville sauvegardée", () => {
    expect(
      getCachedAutoLocationCity({
        lat: 48.8,
        lon: 2.3,
        city: "Paris, France",
      }),
    ).toBe("Paris, France");
  });

  it("getCachedAutoLocationCity retourne null sans ville", () => {
    expect(getCachedAutoLocationCity({ lat: 48.8, lon: 2.3 })).toBeNull();
  });
});
