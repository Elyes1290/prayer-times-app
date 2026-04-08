import Foundation
import WidgetKit
import React

@objc(PrayerTimesWidgetModule)
class PrayerTimesWidgetModule: NSObject {
  
  // App Group pour partager les données avec le widget
  private let appGroupIdentifier = "group.com.drogbinho.myadhan"
  private var sharedDefaults: UserDefaults? {
    return UserDefaults(suiteName: appGroupIdentifier)
  }
  
  // MARK: - React Native Module Setup
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
  
  // MARK: - Update Prayer Times
  
  @objc
  func updatePrayerTimes(
    _ fajr: String,
    sunrise: String,
    dhuhr: String,
    asr: String,
    maghrib: String,
    isha: String,
    tomorrowFajr: String,
    tomorrowSunrise: String,
    tomorrowDhuhr: String,
    tomorrowAsr: String,
    tomorrowMaghrib: String,
    tomorrowIsha: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    print("🕌 [PrayerTimesWidgetModule] Mise à jour des horaires de prière")
    print("   Aujourd'hui - Fajr: \(fajr), Dhuhr: \(dhuhr), Asr: \(asr), Maghrib: \(maghrib), Isha: \(isha)")
    print("   Demain - Fajr: \(tomorrowFajr), Dhuhr: \(tomorrowDhuhr), Asr: \(tomorrowAsr), Maghrib: \(tomorrowMaghrib), Isha: \(tomorrowIsha)")
    
    guard let defaults = sharedDefaults else {
      print("❌ [PrayerTimesWidgetModule] ERREUR: App Group '\(appGroupIdentifier)' non accessible!")
      reject("NO_APP_GROUP", "App Group non configuré", nil)
      return
    }
    
    print("📝 [PrayerTimesWidgetModule] Écriture dans UserDefaults (App Group: \(appGroupIdentifier))...")
    
    // Sauvegarder les horaires d'aujourd'hui dans l'App Group
    defaults.set(fajr, forKey: "today_prayer_Fajr")
    defaults.set(sunrise, forKey: "today_prayer_Sunrise")
    defaults.set(dhuhr, forKey: "today_prayer_Dhuhr")
    defaults.set(asr, forKey: "today_prayer_Asr")
    defaults.set(maghrib, forKey: "today_prayer_Maghrib")
    defaults.set(isha, forKey: "today_prayer_Isha")
    
    // Sauvegarder les horaires de demain
    defaults.set(tomorrowFajr, forKey: "tomorrow_prayer_Fajr")
    defaults.set(tomorrowSunrise, forKey: "tomorrow_prayer_Sunrise")
    defaults.set(tomorrowDhuhr, forKey: "tomorrow_prayer_Dhuhr")
    defaults.set(tomorrowAsr, forKey: "tomorrow_prayer_Asr")
    defaults.set(tomorrowMaghrib, forKey: "tomorrow_prayer_Maghrib")
    defaults.set(tomorrowIsha, forKey: "tomorrow_prayer_Isha")
    
    defaults.set(Date().timeIntervalSince1970, forKey: "prayer_last_update")
    
    let success = defaults.synchronize()
    print("💾 [PrayerTimesWidgetModule] Synchronisation: \(success ? "✅ SUCCÈS" : "❌ ÉCHEC")")
    
    // 🔍 VÉRIFICATION: Relire immédiatement pour confirmer l'écriture
    if let verifyFajr = defaults.string(forKey: "today_prayer_Fajr"),
       let verifyTomorrowFajr = defaults.string(forKey: "tomorrow_prayer_Fajr") {
      print("✅ [PrayerTimesWidgetModule] Vérification: Fajr aujourd'hui = \(verifyFajr), demain = \(verifyTomorrowFajr)")
    } else {
      print("❌ [PrayerTimesWidgetModule] ERREUR: Impossible de relire les données!")
    }
    
    // Demander à WidgetKit de rafraîchir le widget
    if #available(iOS 14.0, *) {
      print("🔄 [PrayerTimesWidgetModule] Demande de rafraîchissement du widget...")
      WidgetCenter.shared.reloadAllTimelines()
      print("✅ [PrayerTimesWidgetModule] Widget rafraîchi (reloadAllTimelines appelé)")
    }
    
    resolve(true)
  }
  
  // MARK: - Get Prayer Times
  
  @objc
  func getPrayerTimes(
    _ resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    guard let defaults = sharedDefaults else {
      reject("NO_APP_GROUP", "App Group non configuré", nil)
      return
    }
    
    let prayerTimes: [String: Any] = [
      "Fajr": defaults.string(forKey: "today_prayer_Fajr") ?? "",
      "Sunrise": defaults.string(forKey: "today_prayer_Sunrise") ?? "",
      "Dhuhr": defaults.string(forKey: "today_prayer_Dhuhr") ?? "",
      "Asr": defaults.string(forKey: "today_prayer_Asr") ?? "",
      "Maghrib": defaults.string(forKey: "today_prayer_Maghrib") ?? "",
      "Isha": defaults.string(forKey: "today_prayer_Isha") ?? "",
      "lastUpdate": defaults.double(forKey: "prayer_last_update")
    ]
    
    resolve(prayerTimes)
  }
  
  // MARK: - Widget Availability
  
  @objc
  func isWidgetAvailable(
    _ resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    // Les widgets sont disponibles depuis iOS 14
    if #available(iOS 14.0, *) {
      resolve(true)
    } else {
      resolve(false)
    }
  }
  
  // MARK: - Force Widget Refresh
  
  @objc
  func forceWidgetRefresh(
    _ resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    if #available(iOS 14.0, *) {
      WidgetCenter.shared.reloadAllTimelines()
      print("🔄 [PrayerTimesWidgetModule] Widget forcé à se rafraîchir")
      resolve(true)
    } else {
      resolve(false)
    }
  }
}
