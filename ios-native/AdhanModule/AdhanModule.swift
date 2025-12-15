import Foundation
import UserNotifications
import Adhan
import React

@objc(AdhanModule)
class AdhanModule: NSObject {
  
  private let userDefaults = UserDefaults.standard
  // 🕌 App Group pour partager avec le Widget
  private let appGroupDefaults = UserDefaults(suiteName: "group.com.drogbinho.myadhan")
  private let prefs = "adhan_prefs"
  private let settingsPrefs = "prayer_times_settings"
  
  // MARK: - React Native Module Setup
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
  
  // 🔧 Activer le délégué de notifications pour debug
  @objc func setupNotificationDelegate() {
    NSLog("🔧 [AdhanModule] Configuration du délégué de notifications...")
    UNUserNotificationCenter.current().delegate = NotificationDelegate.shared
    NSLog("✅ [AdhanModule] Délégué configuré - les logs de notifications seront visibles")
  }
  
  // 📋 Récupérer les logs du délégué de notifications
  @objc func getNotificationLogs(_ resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    let logs = NotificationDelegate.shared.getCapturedLogs()
    resolve(["logs": logs, "count": logs.count])
  }
  
  // 🗑️ Nettoyer les logs du délégué
  @objc func clearNotificationLogs() {
    NotificationDelegate.shared.clearCapturedLogs()
    NSLog("🗑️ [AdhanModule] Logs de notifications nettoyés")
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
            // ✅ NE PAS annuler ici - JS gère l'annulation avant la boucle
            NSLog("📝 Programmation sans annulation préalable...")
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
    for reminder in reminders {
        // 🔑 UTILISER LA CLÉ UNIQUE ENVOYÉE DEPUIS JS (contient la date)
        let key = reminder["key"] as? String ?? "reminder_unknown_\(Int(Date().timeIntervalSince1970))"
        
        var item = reminder
        // Mapper triggerMillis (Android) -> triggerAtMillis (iOS convention locale)
        if let tm = reminder["triggerMillis"] { item["triggerAtMillis"] = tm }
        item["label"] = "reminder"
        formattedReminders[key] = item
    }
    
    requestPermissions { granted in
        if granted {
            // ✅ NE PAS annuler ici - JS gère l'annulation avant la boucle
            NSLog("📝 Programmation sans annulation préalable...")
            self.scheduleNotificationsInternal(formattedReminders, adhanSound: "default", type: "REMINDER")
  }
    }
  }
  
  // MARK: - Dhikr Notifications (NOUVELLE IMPLÉMENTATION)
  
  @objc
  func scheduleDhikrNotifications(_ dhikrNotifications: [[String: Any]]) {
    NSLog("📿 [AdhanModule] Programmation DHIKR iOS (\(dhikrNotifications.count) dhikrs)")
    
    var formattedDhikrs: [String: Any] = [:]
    for dhikr in dhikrNotifications {
        // 🔑 UTILISER LA CLÉ UNIQUE ENVOYÉE DEPUIS JS (contient la date)
        let prayer = dhikr["prayer"] as? String ?? "unknown"
        let type = dhikr["type"] as? String ?? "dhikr"
        let key = dhikr["key"] as? String ?? "dhikr_\(prayer)_\(type)_\(Int(Date().timeIntervalSince1970))"
        
        var item = dhikr
        if let tm = dhikr["triggerMillis"] { item["triggerAtMillis"] = tm }
        item["label"] = "dhikr"
        item["prayer"] = prayer
        formattedDhikrs[key] = item
    }
    
    requestPermissions { granted in
        if granted {
            // ✅ NE PAS annuler ici - JS gère l'annulation avant la boucle
            NSLog("📝 Programmation sans annulation préalable...")
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
          var baseBody = info["notifBody"] as? String ?? "Heure de la prière"
          
          // ℹ️ iOS seulement : ajouter un indice pour jouer l'Adhan complet via clic
          if let iosHint = info["notifHintIos"] as? String, !iosHint.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
              baseBody = "\(baseBody)\n\n\(iosHint)"
          }
          
          content.body = baseBody
          
          // 🎵 SONS iOS : FORMAT .caf OBLIGATOIRE !
          // iOS n'accepte QUE le format .caf (Core Audio Format) pour les notifications
          // Les MP3 ne fonctionnent PAS avec UNNotificationSound !
          let soundFileName = "\(adhanSound).caf"
          
          NSLog("═════════════════════════════════════════════")
          NSLog("🎵 [AdhanModule] CONFIGURATION SON NOTIFICATION")
          NSLog("═════════════════════════════════════════════")
          NSLog("🕌 Prière: \(prayerName)")
          NSLog("🎵 Son demandé: \(soundFileName)")
          NSLog("📂 Recherche dans le bundle...")
          
          // Vérifier si le fichier existe dans le bundle
          if let soundPath = Bundle.main.path(forResource: adhanSound, ofType: "caf") {
              NSLog("✅ [AdhanModule] SUCCÈS: Fichier .caf trouvé!")
              NSLog("📍 Chemin complet: \(soundPath)")
              
              // Vérifier que le fichier existe vraiment
              let fileManager = FileManager.default
              if fileManager.fileExists(atPath: soundPath) {
                  let fileSize = try? fileManager.attributesOfItem(atPath: soundPath)[.size] as? Int ?? 0
                  NSLog("✅ Fichier existe physiquement")
                  NSLog("📊 Taille: \(fileSize ?? 0) bytes")
                  
                  // Créer le son de notification avec le fichier .caf
                  content.sound = UNNotificationSound(named: UNNotificationSoundName(soundFileName))
                  NSLog("✅ UNNotificationSound créé avec: \(soundFileName)")
              } else {
                  NSLog("❌ ERREUR: Chemin trouvé mais fichier n'existe pas!")
                  content.sound = UNNotificationSound.default
              }
          } else {
              NSLog("❌ [AdhanModule] ERREUR: Fichier .caf '\(soundFileName)' NON TROUVÉ")
              NSLog("📂 Listing des fichiers .caf disponibles dans le bundle:")
              
              if let bundlePath = Bundle.main.resourcePath {
                  let fileManager = FileManager.default
                  if let files = try? fileManager.contentsOfDirectory(atPath: bundlePath) {
                      let cafFiles = files.filter { $0.hasSuffix(".caf") }
                      if cafFiles.isEmpty {
                          NSLog("   ❌ AUCUN fichier .caf dans le bundle!")
                          NSLog("   ⚠️ Le plugin Expo n'a pas copié les fichiers .caf")
                          NSLog("   💡 Vérifiez que assets/sounds-ios/ contient les fichiers .caf")
                      } else {
                          NSLog("   📋 \(cafFiles.count) fichiers .caf trouvés:")
                          cafFiles.forEach { file in
                              NSLog("      • \(file)")
                          }
                      }
                  }
              }
              
              NSLog("⚠️ Utilisation du son par défaut iOS")
              content.sound = UNNotificationSound.default
          }
          NSLog("═════════════════════════════════════════════")
          
          content.categoryIdentifier = "PRAYER_NOTIFICATION"
          // Inclure le nom du son pour que React Native puisse jouer le MP3 complet
          content.userInfo = [
              "type": "adhan",
              "prayer": prayerName,
              "soundName": adhanSound  // 🎵 Nom du son (sans extension)
          ]
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
    NSLog("🕌 [saveTodayPrayerTimes] Sauvegarde des horaires du jour...")
    
    // Sauvegarder dans UserDefaults standard (pour l'app)
    for (key, value) in prayerTimes {
      if let strVal = value as? String {
          userDefaults.set(strVal, forKey: "\(settingsPrefs)_today_\(key)")
      }
    }
    userDefaults.synchronize()
    
    // 📱 SAUVEGARDER DANS APP GROUP POUR LE WIDGET iOS
    if let appGroupDefaults = appGroupDefaults {
      for (key, value) in prayerTimes {
        if let strVal = value as? String {
            appGroupDefaults.set(strVal, forKey: "today_prayer_\(key)")
            NSLog("  ✅ Widget: \(key) = \(strVal)")
        }
      }
      appGroupDefaults.synchronize()
      NSLog("✅ [saveTodayPrayerTimes] Horaires sauvegardés pour le widget iOS")
    } else {
      NSLog("⚠️ [saveTodayPrayerTimes] App Group non disponible - le widget ne se mettra pas à jour")
    }
  }
  
  @objc func savePrayerTimesForTomorrow(_ prayerTimes: [String: Any]) {
    for (key, value) in prayerTimes {
      if let strVal = value as? String {
          userDefaults.set(strVal, forKey: "\(settingsPrefs)_tomorrow_\(key)")
      }
    }
    userDefaults.synchronize()
  }
  
  @objc func listAvailableSounds(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    NSLog("🎵 [listAvailableSounds] Recherche des fichiers .caf dans le bundle...")
    
    guard let bundlePath = Bundle.main.resourcePath else {
        NSLog("❌ [listAvailableSounds] Impossible d'accéder au resourcePath")
        resolve(["sounds": [], "count": 0, "bundlePath": "N/A"])
        return
    }
    
    let fileManager = FileManager.default
    
    do {
        let files = try fileManager.contentsOfDirectory(atPath: bundlePath)
        let cafFiles = files.filter { $0.hasSuffix(".caf") }
        
        NSLog("✅ [listAvailableSounds] \(cafFiles.count) fichiers .caf trouvés dans le bundle")
        cafFiles.forEach { file in
            NSLog("   - \(file)")
        }
        
        resolve([
            "sounds": cafFiles,
            "count": cafFiles.count,
            "bundlePath": bundlePath
        ])
    } catch {
        NSLog("❌ [listAvailableSounds] Erreur lecture bundle: \(error.localizedDescription)")
        reject("ERROR", "Failed to list sounds: \(error.localizedDescription)", error)
    }
  }
  
  // 🎵 NOUVEAU : Obtenir le chemin du MP3 complet pour la lecture in-app
  @objc func getFullAdhanPath(_ soundName: NSString, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    NSLog("🎵 [getFullAdhanPath] Recherche du MP3 complet: \(soundName)")
    
    let soundNameStr = soundName as String
    
    // Chercher le MP3 complet dans le bundle
    if let mp3Path = Bundle.main.path(forResource: soundNameStr, ofType: "mp3") {
        NSLog("✅ [getFullAdhanPath] MP3 complet trouvé: \(mp3Path)")
        resolve(["path": mp3Path, "exists": true])
    } else {
        NSLog("❌ [getFullAdhanPath] MP3 complet NON TROUVÉ: \(soundNameStr).mp3")
        
        // Lister les MP3 disponibles pour debug
        if let bundlePath = Bundle.main.resourcePath {
            let fileManager = FileManager.default
            if let files = try? fileManager.contentsOfDirectory(atPath: bundlePath) {
                let mp3Files = files.filter { $0.hasSuffix(".mp3") }
                NSLog("📂 MP3 disponibles dans le bundle:")
                mp3Files.forEach { file in
                    NSLog("   - \(file)")
                }
            }
        }
        
        reject("NOT_FOUND", "MP3 file not found: \(soundNameStr).mp3", nil)
    }
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
