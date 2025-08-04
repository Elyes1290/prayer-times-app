import { computePrayerTimesForDate } from "../../utils/prayerTimes";

describe("Prayer Times Calculation", () => {
  test("should calculate prayer times for Paris", () => {
    const location = {
      latitude: 48.8566,
      longitude: 2.3522,
    };
    const date = new Date("2024-01-15");
    const method = "MuslimWorldLeague";

    const times = computePrayerTimesForDate(date, location, method);

    // Vérifier que toutes les prières sont définies
    expect(times.Fajr).toBeDefined();
    expect(times.Sunrise).toBeDefined();
    expect(times.Dhuhr).toBeDefined();
    expect(times.Asr).toBeDefined();
    expect(times.Maghrib).toBeDefined();
    expect(times.Isha).toBeDefined();

    // Vérifier que ce sont bien des objets Date
    expect(times.Fajr).toBeInstanceOf(Date);
    expect(times.Sunrise).toBeInstanceOf(Date);

    // Vérifier l'ordre chronologique des prières
    expect(times.Fajr.getTime()).toBeLessThan(times.Sunrise.getTime());
    expect(times.Sunrise.getTime()).toBeLessThan(times.Dhuhr.getTime());
    expect(times.Dhuhr.getTime()).toBeLessThan(times.Asr.getTime());
    expect(times.Asr.getTime()).toBeLessThan(times.Maghrib.getTime());
    expect(times.Maghrib.getTime()).toBeLessThan(times.Isha.getTime());

    // Vérifier que les horaires sont cohérents (Fajr avant le lever du soleil)
    expect(times.Fajr.getHours()).toBeGreaterThanOrEqual(4);
    expect(times.Fajr.getHours()).toBeLessThan(8);
  });

  test("should handle different calculation methods", () => {
    const location = {
      latitude: 21.4225, // Mecca
      longitude: 39.8262,
    };
    const date = new Date("2024-06-15");

    const mwlTimes = computePrayerTimesForDate(
      date,
      location,
      "MuslimWorldLeague"
    );
    const egyptTimes = computePrayerTimesForDate(date, location, "Egyptian");

    // Les méthodes différentes doivent donner des résultats légèrement différents
    expect(mwlTimes.Fajr.getTime()).not.toBe(egyptTimes.Fajr.getTime());

    // Mais toutes doivent être valides
    expect(mwlTimes.Fajr).toBeInstanceOf(Date);
    expect(egyptTimes.Fajr).toBeInstanceOf(Date);
  });

  test("should handle unknown calculation method", () => {
    const location = {
      latitude: 48.8566,
      longitude: 2.3522,
    };
    const date = new Date("2024-01-15");

    // Méthode inconnue devrait utiliser MuslimWorldLeague par défaut
    const times = computePrayerTimesForDate(date, location, "UnknownMethod");

    expect(times.Fajr).toBeDefined();
    expect(times.Fajr).toBeInstanceOf(Date);
  });

  test("should handle various locations", () => {
    const locations = [
      { name: "Paris", lat: 48.8566, lng: 2.3522 },
      { name: "New York", lat: 40.7128, lng: -74.006 },
      { name: "Tokyo", lat: 35.6762, lng: 139.6503 },
      { name: "Sydney", lat: -33.8688, lng: 151.2093 },
    ];

    const date = new Date("2024-06-21"); // Solstice d'été

    locations.forEach((loc) => {
      const times = computePrayerTimesForDate(
        date,
        { latitude: loc.lat, longitude: loc.lng },
        "MuslimWorldLeague"
      );

      // Chaque location devrait avoir des horaires valides
      expect(times.Fajr).toBeInstanceOf(Date);
      expect(times.Maghrib).toBeInstanceOf(Date);

      // L'ordre chronologique doit être respecté
      expect(times.Fajr.getTime()).toBeLessThan(times.Maghrib.getTime());
    });
  });
});
