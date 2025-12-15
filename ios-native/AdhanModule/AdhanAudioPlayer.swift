import Foundation
import AVFoundation
import React

/**
 * Module natif iOS pour jouer l'Adhan complet avec AVAudioPlayer
 * Utilisé uniquement sur iOS quand l'utilisateur clique sur une notification
 */
@objc(AdhanAudioPlayer)
class AdhanAudioPlayer: RCTEventEmitter {
  
  private var audioPlayer: AVAudioPlayer?
  private var isPlaying = false
  private var currentSoundName: String?
  private var currentPrayer: String?
  
  // MARK: - React Native Setup
  
  override init() {
    super.init()
    
    // 🎵 NOUVEAU : Écouter les notifications système pour les transmettre à React Native
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(handleAdhanNotificationReceived(_:)),
      name: NSNotification.Name("AdhanNotificationReceived"),
      object: nil
    )
    NSLog("✅ [AdhanAudioPlayer] Listener NotificationCenter configuré")
  }
  
  deinit {
    NotificationCenter.default.removeObserver(self)
  }
  
  override static func requiresMainQueueSetup() -> Bool {
    return true
  }
  
  override func supportedEvents() -> [String]! {
    return [
      "AdhanPlaybackStarted",
      "AdhanPlaybackStopped",
      "AdhanPlaybackFinished",
      "AdhanPlaybackError",
      "AdhanNotificationReceived" // 🎵 NOUVEAU : Événement quand notification arrive en foreground
    ]
  }
  
  // 🎵 Handler pour les notifications système
  @objc private func handleAdhanNotificationReceived(_ notification: Notification) {
    guard let userInfo = notification.userInfo,
          let soundName = userInfo["soundName"] as? String,
          let prayer = userInfo["prayer"] as? String else {
      NSLog("⚠️ [AdhanAudioPlayer] Notification reçue mais données invalides")
      return
    }
    
    NSLog("🎵 [AdhanAudioPlayer] Notification système reçue: \(soundName) pour \(prayer)")
    
    // Transmettre l'événement à React Native
    sendEvent(withName: "AdhanNotificationReceived", body: [
      "soundName": soundName,
      "prayer": prayer
    ])
  }
  
  // MARK: - Audio Session Configuration
  
  private func configureAudioSession() throws {
    let audioSession = AVAudioSession.sharedInstance()
    try audioSession.setCategory(.playback, mode: .default, options: [.mixWithOthers])
    try audioSession.setActive(true)
    NSLog("✅ [AdhanAudioPlayer] Session audio configurée")
  }
  
  // MARK: - Play Adhan
  
  @objc
  func playAdhanWithURI(_ uri: String, prayer: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    NSLog("═══════════════════════════════════════════")
    NSLog("🎵 [AdhanAudioPlayer] playAdhanWithURI appelé")
    NSLog("═══════════════════════════════════════════")
    NSLog("🎵 URI: \(uri)")
    NSLog("🕌 Prière: \(prayer)")
    
    // Arrêter toute lecture précédente
    stopAdhan()
    
    // Configurer la session audio
    do {
      try configureAudioSession()
    } catch {
      NSLog("❌ [AdhanAudioPlayer] Erreur configuration session audio: \(error.localizedDescription)")
      reject("AUDIO_SESSION_ERROR", "Erreur configuration session audio", error)
      return
    }
    
    // Créer l'URL depuis l'URI fournie par React Native
    guard let url = URL(string: uri) else {
      NSLog("❌ [AdhanAudioPlayer] URI invalide: \(uri)")
      reject("INVALID_URI", "Invalid URI: \(uri)", nil)
      return
    }
    
    NSLog("✅ [AdhanAudioPlayer] URL créée: \(url)")
    
    // Créer l'AVAudioPlayer
    do {
      audioPlayer = try AVAudioPlayer(contentsOf: url)
      
      guard let player = audioPlayer else {
        reject("INIT_ERROR", "Impossible de créer AVAudioPlayer", nil)
        return
      }
      
      // Configurer le player
      player.prepareToPlay()
      player.numberOfLoops = 0 // Ne pas boucler
      
      // Définir le délégué pour détecter la fin de lecture
      player.delegate = self
      
      // Sauvegarder les infos (extraire le nom du son depuis l'URI si possible)
      let soundNameFromURI = url.lastPathComponent.replacingOccurrences(of: ".mp3", with: "")
      currentSoundName = soundNameFromURI
      currentPrayer = prayer
      
      // Jouer
      let success = player.play()
      
      if success {
        isPlaying = true
        NSLog("✅ [AdhanAudioPlayer] Lecture démarrée avec succès")
        
        // Émettre l'événement de démarrage
        sendEvent(withName: "AdhanPlaybackStarted", body: [
          "soundName": soundNameFromURI,
          "prayer": prayer
        ])
        
        resolve([
          "success": true,
          "soundName": soundNameFromURI,
          "prayer": prayer
        ])
      } else {
        NSLog("❌ [AdhanAudioPlayer] Échec du démarrage de la lecture")
        reject("PLAY_ERROR", "Impossible de démarrer la lecture", nil)
      }
      
    } catch {
      NSLog("❌ [AdhanAudioPlayer] Erreur création AVAudioPlayer: \(error.localizedDescription)")
      reject("INIT_ERROR", "Erreur création AVAudioPlayer: \(error.localizedDescription)", error)
    }
  }
  
  // MARK: - Stop Adhan
  
  @objc
  func stopAdhan() {
    NSLog("⏹️ [AdhanAudioPlayer] stopAdhan appelé")
    
    if let player = audioPlayer {
      if player.isPlaying {
        player.stop()
        NSLog("✅ [AdhanAudioPlayer] Lecture arrêtée")
      }
      player.delegate = nil
    }
    
    audioPlayer = nil
    isPlaying = false
    
    // Émettre l'événement d'arrêt si on avait une lecture en cours
    if currentSoundName != nil {
      sendEvent(withName: "AdhanPlaybackStopped", body: [
        "soundName": currentSoundName ?? "",
        "prayer": currentPrayer ?? ""
      ])
    }
    
    currentSoundName = nil
    currentPrayer = nil
  }
  
  // MARK: - Get Status
  
  @objc
  func getStatus(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    let status: [String: Any] = [
      "isPlaying": isPlaying,
      "soundName": currentSoundName ?? "",
      "prayer": currentPrayer ?? "",
      "duration": audioPlayer?.duration ?? 0.0,
      "currentTime": audioPlayer?.currentTime ?? 0.0
    ]
    resolve(status)
  }
}

// MARK: - AVAudioPlayerDelegate

extension AdhanAudioPlayer: AVAudioPlayerDelegate {
  
  func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
    NSLog("═══════════════════════════════════════════")
    NSLog("✅ [AdhanAudioPlayer] Lecture terminée (succès: \(flag))")
    NSLog("═══════════════════════════════════════════")
    
    isPlaying = false
    
    // Émettre l'événement de fin
    sendEvent(withName: "AdhanPlaybackFinished", body: [
      "soundName": currentSoundName ?? "",
      "prayer": currentPrayer ?? "",
      "success": flag
    ])
    
    // Nettoyer
    audioPlayer = nil
    currentSoundName = nil
    currentPrayer = nil
  }
  
  func audioPlayerDecodeErrorDidOccur(_ player: AVAudioPlayer, error: Error?) {
    NSLog("❌ [AdhanAudioPlayer] Erreur décodage audio: \(error?.localizedDescription ?? "unknown")")
    
    isPlaying = false
    
    // Émettre l'événement d'erreur
    sendEvent(withName: "AdhanPlaybackError", body: [
      "soundName": currentSoundName ?? "",
      "prayer": currentPrayer ?? "",
      "error": error?.localizedDescription ?? "Unknown error"
    ])
    
    // Nettoyer
    audioPlayer = nil
    currentSoundName = nil
    currentPrayer = nil
  }
}

