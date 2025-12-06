import Foundation
import WidgetKit
import React

@objc(QuranWidgetModule)
class QuranWidgetModule: NSObject {
  
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
  
  // MARK: - Widget Audio Update
  
  @objc
  func updateWidgetAudio(_ surah: String, reciter: String, audioPath: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    print("🎵 [QuranWidgetModule] Mise à jour audio widget: \(surah) par \(reciter)")
    
    guard let defaults = sharedDefaults else {
      reject("NO_APP_GROUP", "App Group non configuré", nil)
      return
    }
    
    // Sauvegarder les données dans l'App Group
    defaults.set(surah, forKey: "widget_current_surah")
    defaults.set(reciter, forKey: "widget_current_reciter")
    defaults.set(audioPath, forKey: "widget_audio_path")
    defaults.set(Date().timeIntervalSince1970, forKey: "widget_last_update")
    defaults.synchronize()
    
    // Demander à WidgetKit de rafraîchir le widget
    if #available(iOS 14.0, *) {
      WidgetCenter.shared.reloadAllTimelines()
    }
    
    print("✅ [QuranWidgetModule] Widget mis à jour")
    resolve(true)
  }
  
  // MARK: - Widget Playback State
  
  @objc
  func updateWidgetPlaybackState(_ isPlaying: Bool, position: Int, duration: Int, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    print("▶️ [QuranWidgetModule] Mise à jour état lecture: \(isPlaying)")
    
    guard let defaults = sharedDefaults else {
      reject("NO_APP_GROUP", "App Group non configuré", nil)
      return
    }
    
    defaults.set(isPlaying, forKey: "widget_is_playing")
    defaults.set(position, forKey: "widget_position")
    defaults.set(duration, forKey: "widget_duration")
    defaults.set(Date().timeIntervalSince1970, forKey: "widget_last_update")
    defaults.synchronize()
    
    // Rafraîchir le widget
    if #available(iOS 14.0, *) {
      WidgetCenter.shared.reloadAllTimelines()
    }
    
    resolve(true)
  }
  
  // MARK: - Widget Premium Status
  
  @objc
  func updateWidgetPremiumStatus(_ isPremium: Bool, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    print("💎 [QuranWidgetModule] Mise à jour statut premium: \(isPremium)")
    
    guard let defaults = sharedDefaults else {
      reject("NO_APP_GROUP", "App Group non configuré", nil)
      return
    }
    
    defaults.set(isPremium, forKey: "widget_is_premium")
    defaults.set(Date().timeIntervalSince1970, forKey: "widget_last_update")
    defaults.synchronize()
    
    // Rafraîchir le widget
    if #available(iOS 14.0, *) {
      WidgetCenter.shared.reloadAllTimelines()
    }
    
    resolve(true)
  }
  
  @objc
  func forcePremiumStatus(_ isPremium: Bool, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    print("💎 [QuranWidgetModule] Force statut premium: \(isPremium)")
    
    updateWidgetPremiumStatus(isPremium, resolver: resolve, rejecter: reject)
  }
  
  @objc
  func getPremiumStatus(_ resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    guard let defaults = sharedDefaults else {
      reject("NO_APP_GROUP", "App Group non configuré", nil)
      return
    }
    
    let isPremium = defaults.bool(forKey: "widget_is_premium")
    resolve(isPremium)
  }
  
  @objc
  func syncPremiumStatus(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    // Sur iOS, on lit simplement le statut depuis les UserDefaults
    getPremiumStatus(resolve, rejecter: reject)
  }
  
  // MARK: - Widget Availability
  
  @objc
  func isWidgetAvailable(_ resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    // Les widgets sont disponibles depuis iOS 14
    if #available(iOS 14.0, *) {
      resolve(true)
    } else {
      resolve(false)
    }
  }
  
  // MARK: - Diagnostic (Stub)
  
  @objc
  func runDiagnostic(_ resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    guard let defaults = sharedDefaults else {
      let diagnostic: [String: Any] = [
        "success": false,
        "error": "App Group non configuré",
        "appGroupId": appGroupIdentifier
      ]
      resolve(diagnostic)
      return
    }
    
    let diagnostic: [String: Any] = [
      "success": true,
      "appGroupId": appGroupIdentifier,
      "widgetAvailable": true,
      "currentSurah": defaults.string(forKey: "widget_current_surah") ?? "",
      "currentReciter": defaults.string(forKey: "widget_current_reciter") ?? "",
      "isPlaying": defaults.bool(forKey: "widget_is_playing"),
      "isPremium": defaults.bool(forKey: "widget_is_premium"),
      "lastUpdate": defaults.double(forKey: "widget_last_update")
    ]
    
    resolve(diagnostic)
  }
  
  // MARK: - Audio Service Integration (Stubs pour compatibilité)
  
  @objc
  func startAudioService() {
    print("🎵 [QuranWidgetModule] startAudioService appelé (stub iOS)")
    // Sur iOS, ceci sera géré directement par QuranAudioServiceModule
  }
  
  @objc
  func loadAudioInService(_ audioPath: String, surah: String, reciter: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    print("🎵 [QuranWidgetModule] loadAudioInService appelé (stub iOS)")
    // Sur iOS, ceci sera géré directement par QuranAudioServiceModule
    resolve(false)
  }
  
  // MARK: - Widget Data Helpers
  
  func getWidgetData() -> [String: Any]? {
    guard let defaults = sharedDefaults else { return nil }
    
    return [
      "surah": defaults.string(forKey: "widget_current_surah") ?? "",
      "reciter": defaults.string(forKey: "widget_current_reciter") ?? "",
      "audioPath": defaults.string(forKey: "widget_audio_path") ?? "",
      "isPlaying": defaults.bool(forKey: "widget_is_playing"),
      "position": defaults.integer(forKey: "widget_position"),
      "duration": defaults.integer(forKey: "widget_duration"),
      "isPremium": defaults.bool(forKey: "widget_is_premium"),
      "lastUpdate": defaults.double(forKey: "widget_last_update")
    ]
  }
  
  func clearWidgetData() {
    guard let defaults = sharedDefaults else { return }
    
    defaults.removeObject(forKey: "widget_current_surah")
    defaults.removeObject(forKey: "widget_current_reciter")
    defaults.removeObject(forKey: "widget_audio_path")
    defaults.removeObject(forKey: "widget_is_playing")
    defaults.removeObject(forKey: "widget_position")
    defaults.removeObject(forKey: "widget_duration")
    defaults.removeObject(forKey: "widget_is_premium")
    defaults.removeObject(forKey: "widget_last_update")
    defaults.synchronize()
    
    // Rafraîchir le widget
    if #available(iOS 14.0, *) {
      WidgetCenter.shared.reloadAllTimelines()
    }
  }
}
