import { FRIDAY_TEST_EVERY_DAY } from "../../../utils/friday/debug";

describe("friday/debug — garde-fou avant release", () => {
  it("l'interrupteur de test doit être `false` en production", () => {
    // ÉCHOUE VOLONTAIREMENT tant que le mode test est actif (utils/friday/debug.ts).
    expect(FRIDAY_TEST_EVERY_DAY).toBe(false);
  });
});
