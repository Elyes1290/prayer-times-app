// Premier test simple pour vérifier que Jest fonctionne
describe("Tests de base", () => {
  test("Jest fonctionne correctement", () => {
    expect(2 + 2).toBe(4);
    expect("hello").toBe("hello");
    expect(true).toBeTruthy();
  });

  test("Test avec des objets", () => {
    const user = { name: "Muslim", age: 25 };
    expect(user).toHaveProperty("name");
    expect(user.name).toBe("Muslim");
  });

  test("Test avec des tableaux", () => {
    const prayers = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
    expect(prayers).toHaveLength(5);
    expect(prayers).toContain("Fajr");
    expect(prayers[0]).toBe("Fajr");
  });
});
