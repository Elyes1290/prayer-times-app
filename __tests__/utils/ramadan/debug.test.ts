import {
  getRamadanTestStartDate,
  RAMADAN_TEST_START_DATE,
} from "../../../utils/ramadan/debug";

describe("ramadan/debug — garde-fou avant release", () => {
  it("l'interrupteur de test doit être `null` en production", () => {
    // ÉCHOUE VOLONTAIREMENT tant que la date de test est active (utils/ramadan/debug.ts).
    expect(RAMADAN_TEST_START_DATE).toBeNull();
  });

  it("est toujours désactivé pendant les tests Jest", () => {
    expect(getRamadanTestStartDate()).toBeNull();
  });
});
