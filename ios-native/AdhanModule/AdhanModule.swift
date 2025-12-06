import Foundation
import UserNotifications
import Adhan
import React

@objc(AdhanModule)
class AdhanModule: NSObject {
  
  private let userDefaults = UserDefaults.standard
  private let prefs = "adhan_prefs"
  private let settingsPrefs = "prayer_times_settings"
  
  // MARK: - React Native Module Setup
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
  
  // MARK: - Location Management
  
  @objc
  func setLocation(_ lat: Double, lon: Double) {
    NSLog("🗺️ [AdhanModule] Sauvegarde localisation: \(lat), \(lon)")
    userDefaults.set(lat, forKey: "\(prefs)_latitude")
    userDefaults.set(lon, forKey: "\(prefs)_longitude")
    userDefaults.synchronize()
  }
  
  @objc
  func getSavedAutoLocation(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let lat = userDefaults.object(forKey: "\(settingsPrefs)_auto_location_lat") as? Double,
          let lon = userDefaults.object(forKey: "\(settingsPrefs)_auto_location_lon") as? Double else {
      resolve([:])
      return
    }
    resolve(["lat": lat, "lon": lon])
  }
  
  // MARK: - Notification Settings
  
  @objc
  func saveNotificationSettings(_ settings: [String: Any]) {
    NSLog("💾 [AdhanModule] Sauvegarde paramètres notifications")
    for (key, value) in settings {
      let prefKey = "\(settingsPrefs)_\(key)"
      if let val = value as? String { userDefaults.set(val, forKey: prefKey) }
      else if let val = value as? NSNumber { userDefaults.set(val, forKey: prefKey) }
      else if let val = value as? Bool { userDefaults.set(val, forKey: prefKey) }
    }
    userDefaults.synchronize()
  }
  
  @objc
  func setAdhanSound(_ adhanSound: String) {
    NSLog("🎵 [AdhanModule] Son défini: \(adhanSound)")
    userDefaults.set(adhanSound, forKey: "\(prefs)_adhan_sound")
    userDefaults.synchronize()
  }
  
  @objc
  func setAdhanVolume(_ volume: Float) {
    userDefaults.set(volume, forKey: "\(prefs)_adhan_volume")
    userDefaults.synchronize()
  }
  
  @objc
  func getAdhanVolume(_ resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    let volume = userDefaults.float(forKey: "\(prefs)_adhan_volume")
    resolve(volume)
  }
  
  // MARK: - Prayer Times Calculation
  
  @objc
  func calculatePrayerTimes(_ params: [String: Any], resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let lat = params["latitude"] as? Double,
          let lon = params["longitude"] as? Double else {
      reject("INVALID_PARAMS", "Latitude et longitude requis", nil)
      return
    }
    
    let coordinates = Coordinates(latitude: lat, longitude: lon)
    let date = Date()
    let calendar = Calendar.current
    let dateComponents = calendar.dateComponents([.year, .month, .day], from: date)
    
    let methodStr = params["calculationMethod"] as? String ?? userDefaults.string(forKey: "\(prefs)_calculation_method") ?? "MuslimWorldLeague"
    let calculationMethod = getCalculationMethod(methodStr)
    var calculationParams = calculationMethod.params
    
    if let fajrAngle = params["fajrAngle"] as? Double { calculationParams.fajrAngle = fajrAngle }
    if let ishaAngle = params["ishaAngle"] as? Double { calculationParams.ishaAngle = ishaAngle }
    
    guard let prayerTimes = PrayerTimes(coordinates: coordinates, date: dateComponents, calculationParameters: calculationParams) else {
      reject("CALCULATION_ERROR", "Erreur calcul horaires prière", nil)
      return
    }
    
    let formatter = DateFormatter()
    formatter.timeStyle = .short
    formatter.dateStyle = .none
    
    let result: [String: String] = [
      "fajr": formatter.string(from: prayerTimes.fajr),
      "sunrise": formatter.string(from: prayerTimes.sunrise),
      "dhuhr": formatter.string(from: prayerTimes.dhuhr),
      "asr": formatter.string(from: prayerTimes.asr),
      "maghrib": formatter.string(from: prayerTimes.maghrib),
      "isha": formatter.string(from: prayerTimes.isha)
    ]
    resolve(result)
  }

  // MARK: - Adhan Scheduling
  
  @objc
  func scheduleAdhanAlarms(_ prayerTimes: [String: Any], adhanSound: String) {
    NSLog("═════════════════════════════════════════════")
    NSLog("🚀 [scheduleAdhanAlarms] APPELÉ DEPUIS JS")
    NSLog("═════════════════════════════════════════════")
    NSLog("📦 Nombre d'entrées: \(prayerTimes.count)")
    NSLog("🔊 Son Adhan: \(adhanSound)")
    NSLog("🔍 Données brutes: \(prayerTimes)")
    
    requestPermissions { granted in
        NSLog("🔐 Permission notifications: \(granted ? "✅ GRANTED" : "❌ DENIED")")
        if granted {
            NSLog("🗑️ Annulation adhans existants...")
            self.cancelNotifications(prefix: "adhan")
            NSLog("✅ Annulation terminée, début programmation...")
            self.scheduleNotificationsInternal(prayerTimes, adhanSound: adhanSound, type: "ADHAN")
            NSLog("═════════════════════════════════════════════")
            NSLog("✅ [scheduleAdhanAlarms] TERMINÉ")
            NSLog("═════════════════════════════════════════════")
        } else {
            NSLog("❌ [scheduleAdhanAlarms] ÉCHEC: Permissions refusées")
        }
    }
  }
  
  @objc
  func schedulePrayerReminders(_ reminders: [[String: Any]]) {
    NSLog("⏰ [AdhanModule] Programmation RAPPELS iOS (\(reminders.count) rappels)")
    
    var formattedReminders: [String: Any] = [:]
    for (index, reminder) in reminders.enumerated() {
        let time = Int(Date().timeIntervalSince1970)
        let prayer = reminder["prayer"] as? String ?? "unknown"
        let key = "reminder_\(prayer)_\(index)_\(time)"
        
        var item = reminder
        // Mapper triggerMillis (Android) -> triggerAtMillis (iOS convention locale)
        if let tm = reminder["triggerMillis"] { item["triggerAtMillis"] = tm }
        item["label"] = "reminder"
        formattedReminders[key] = item
    }
    
    requestPermissions { granted in
        if granted {
            self.cancelNotifications(prefix: "reminder")
            self.scheduleNotificationsInternal(formattedReminders, adhanSound: "default", type: "REMINDER")
        }
    }
  }
  
  // MARK: - Dhikr Notifications (NOUVELLE IMPLÉMENTATION)
  
  @objc
  func scheduleDhikrNotifications(_ dhikrNotifications: [[String: Any]]) {
    NSLog("📿 [AdhanModule] Programmation DHIKR iOS (\(dhikrNotifications.count) dhikrs)")
    
    var formattedDhikrs: [String: Any] = [:]
    for (index, dhikr) in dhikrNotifications.enumerated() {
        let prayer = dhikr["prayer"] as? String ?? "unknown"
        let type = dhikr["type"] as? String ?? "dhikr"
        let key = "dhikr_\(prayer)_\(type)_\(index)"
        
        var item = dhikr
        if let tm = dhikr["triggerMillis"] { item["triggerAtMillis"] = tm }
        item["label"] = "dhikr"
        item["prayer"] = prayer
        formattedDhikrs[key] = item
    }
    
    requestPermissions { granted in
        if granted {
            self.cancelNotifications(prefix: "dhikr")
            self.scheduleNotificationsInternal(formattedDhikrs, adhanSound: "default", type: "DHIKR")
        }
    }
  }
  
  @objc
  func cancelAllDhikrNotifications() {
    NSLog("🚫 [AdhanModule] Annulation DHIKR")
    cancelNotifications(prefix: "dhikr")
  }

  @objc
  func cancelAllAdhanAlarms() {
    NSLog("🚫 [AdhanModule] Annulation TOUTES ADHAN")
    cancelNotifications(prefix: "adhan")
  }
  
  @objc
  func cancelAllPrayerReminders() {
    NSLog("🚫 [AdhanModule] Annulation TOUS RAPPELS")
    cancelNotifications(prefix: "reminder")
  }
  
  // MARK: - Shared Scheduling Logic
  
  private func cancelNotifications(prefix: String) {
      let center = UNUserNotificationCenter.current()
      center.getPendingNotificationRequests { requests in
          let idsToRemove = requests.filter { $0.identifier.hasPrefix(prefix) || $0.identifier.hasPrefix(prefix.uppercased()) }.map { $0.identifier }
          if !idsToRemove.isEmpty {
              center.removePendingNotificationRequests(withIdentifiers: idsToRemove)
              NSLog("🗑️ [AdhanModule] Supprimé \(idsToRemove.count) notifs avec préfixe '\(prefix)'")
          }
      }
  }
  
  private func requestPermissions(completion: @escaping (Bool) -> Void) {
    let center = UNUserNotificationCenter.current()
    center.getNotificationSettings { settings in
        if settings.authorizationStatus == .notDetermined {
            center.requestAuthorization(options: [.alert, .sound, .badge, .criticalAlert]) { granted, error in
                if let error = error { NSLog("❌ Erreur permission: \(error.localizedDescription)") }
                completion(granted)
            }
        } else {
            completion(settings.authorizationStatus == .authorized || settings.authorizationStatus == .provisional)
        }
    }
  }

  private func scheduleNotificationsInternal(_ items: [String: Any], adhanSound: String, type: String) {
    let center = UNUserNotificationCenter.current()
    var count = 0
    var skipped = 0
    
    NSLog("🔧 [scheduleNotificationsInternal] Début - \(items.count) items à traiter")
    
    for (key, value) in items {
      NSLog("🔍 [scheduleNotificationsInternal] Processing key: \(key)")
      NSLog("🔍 [scheduleNotificationsInternal] Value: \(value)")
      
      guard let info = value as? [String: Any] else {
          NSLog("❌ [scheduleNotificationsInternal] \(key) - value n'est pas un dictionnaire")
          skipped += 1
          continue
      }
      
      NSLog("🔍 [scheduleNotificationsInternal] \(key) - info keys: \(info.keys)")
      
      guard let triggerAtMillis = info["triggerAtMillis"] as? Double else {
          NSLog("❌ [scheduleNotificationsInternal] \(key) - triggerAtMillis manquant ou invalide")
          NSLog("   Valeur reçue: \(info["triggerAtMillis"] ?? "nil")")
          skipped += 1
          continue
      }
      
      guard let prayerName = info["prayer"] as? String else {
          NSLog("❌ [scheduleNotificationsInternal] \(key) - prayer manquant ou invalide")
          NSLog("   Valeur reçue: \(info["prayer"] ?? "nil")")
          skipped += 1
          continue
      }
      
      NSLog("✅ [scheduleNotificationsInternal] \(key) - Données valides: prayer=\(prayerName), trigger=\(triggerAtMillis)")
            
      let triggerDate = Date(timeIntervalSince1970: triggerAtMillis / 1000.0)
      
      // Ne pas planifier dans le passé
      if triggerDate <= Date() { continue }
      
      let content = UNMutableNotificationContent()
      
      if type == "ADHAN" {
          content.title = "🕌 \(prayerName.capitalized)"
          content.body = info["notifBody"] as? String ?? "Heure de la prière"
          // Pour iOS, le son doit être dans le bundle principal
          content.sound = UNNotificationSound(named: UNNotificationSoundName("\(adhanSound).mp3"))
          content.categoryIdentifier = "PRAYER_NOTIFICATION"
          content.userInfo = ["type": "adhan", "prayer": prayerName]
      } else if type == "DHIKR" {
          content.title = info["title"] as? String ?? "📿 Dhikr"
          content.body = info["body"] as? String ?? "N'oubliez pas vos invocations"
          content.sound = UNNotificationSound.default
          content.categoryIdentifier = "DHIKR_NOTIFICATION"
          content.userInfo = ["type": "dhikr", "prayer": prayerName]
      } else { // REMINDER
          content.title = info["title"] as? String ?? "Rappel"
          content.body = info["body"] as? String ?? "Rappel de prière"
          content.sound = UNNotificationSound.default
          content.categoryIdentifier = "PRAYER_REMINDER"
          content.userInfo = ["type": "reminder", "prayer": prayerName]
      }
      
      if #available(iOS 15.0, *) {
          content.interruptionLevel = .timeSensitive
      }
      
      let components = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute, .second], from: triggerDate)
      let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
      
      // ID unique: prefix_key
      let identifier = "\(type.lowercased())_\(key)"
      let request = UNNotificationRequest(identifier: identifier, content: content, trigger: trigger)
      
      center.add(request) { error in
        if let e = error {
            NSLog("❌ Erreur programmation \(identifier): \(e.localizedDescription)")
        }
      }
      count += 1
    }
    NSLog("✅ [AdhanModule] \(count) notifs de type \(type) programmées")
    NSLog("⚠️ [AdhanModule] \(skipped) notifs ignorées (données invalides)")
    NSLog("📊 [AdhanModule] Total traité: \(items.count), Programmé: \(count), Ignoré: \(skipped)")
  }

  // MARK: - Stubs & Helpers
  
  @objc func debugLog(_ message: String) {
    NSLog("🔥 [DEBUG-JS] \(message)")
  }
  
  @objc func forceUpdateWidgets() {}
  @objc func updateWidget() {}
  @objc func startDailyMaintenance() {}
  @objc func startWidgetUpdateScheduler() {}
  
  @objc func saveTodayPrayerTimes(_ prayerTimes: [String: Any]) {
    // Implémentation simple pour sauvegarder les horaires locaux
    for (key, value) in prayerTimes {
      if let strVal = value as? String {
          userDefaults.set(strVal, forKey: "\(settingsPrefs)_today_\(key)")
      }
    }
    userDefaults.synchronize()
  }
  
  @objc func savePrayerTimesForTomorrow(_ prayerTimes: [String: Any]) {
    for (key, value) in prayerTimes {
      if let strVal = value as? String {
          userDefaults.set(strVal, forKey: "\(settingsPrefs)_tomorrow_\(key)")
      }
    }
    userDefaults.synchronize()
  }
  
  @objc func debugNotifications(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
     let center = UNUserNotificationCenter.current()
     center.getPendingNotificationRequests { requests in
         let count = requests.count
         let info = requests.map { ["id": $0.identifier, "title": $0.content.title, "body": $0.content.body] }
         resolve(["pendingCount": count, "notifications": info])
     }
  }
  
  private func getCalculationMethod(_ methodStr: String) -> CalculationMethod {
    switch methodStr {
    case "MuslimWorldLeague": return .muslimWorldLeague
    case "Egyptian": return .egyptian
    case "Karachi": return .karachi
    case "UmmAlQura": return .ummAlQura
    case "Dubai": return .dubai
    case "MoonsightingCommittee": return .moonsightingCommittee
    case "NorthAmerica": return .northAmerica
    case "Kuwait": return .kuwait
    case "Qatar": return .qatar
    case "Singapore": return .singapore
    default: return .muslimWorldLeague
    }
  }
}
