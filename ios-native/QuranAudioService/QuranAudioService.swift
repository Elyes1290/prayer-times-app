import Foundation
import AVFoundation
import MediaPlayer
import React

@objc(QuranAudioServiceModule)
class QuranAudioServiceModule: RCTEventEmitter {
  
  private var audioPlayer: AVAudioPlayer?
  private var isPlaying = false
  private var currentAudioPath: String?
  private var currentSurah: String?
  private var currentReciter: String?
  private var currentPosition: TimeInterval = 0
  private var totalDuration: TimeInterval = 0
  private var updateTimer: Timer?
  private var isPremium = false
  private var authToken: String?
  private var autoAdvanceEnabled = false
  private var loopEnabled = false
  
  // MARK: - React Native Event Emitter
  
  override static func requiresMainQueueSetup() -> Bool {
    return true
  }
  
  override func supportedEvents() -> [String]! {
    return [
      "AudioStateChanged",
      "AudioCompleted",
      "AudioError",
      "PremiumStatusChanged"
    ]
  }
  
  // MARK: - Service Lifecycle
  
  @objc
  func startAudioService(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    NSLog("🎵 [QuranAudioService] Démarrage service audio iOS")
    
    do {
      // Configurer la session audio pour le background
      let audioSession = AVAudioSession.sharedInstance()
      try audioSession.setCategory(.playback, mode: .default, options: [])
      try audioSession.setActive(true)
      
      // Activer les contrôles écran verrouillé
      setupRemoteTransportControls()
      
      NSLog("✅ [QuranAudioService] Service audio démarré")
      resolve(true)
    } catch {
      NSLog("❌ [QuranAudioService] Erreur démarrage: \(error)")
      reject("START_ERROR", "Erreur démarrage service audio", error)
    }
  }
  
  @objc
  func stopAudioService(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    NSLog("🛑 [QuranAudioService] Arrêt service audio")
    
    stopAudio(resolve, rejecter: reject)
    
    // Désactiver la session audio
    try? AVAudioSession.sharedInstance().setActive(false)
    
    // Nettoyer les contrôles
    MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
  }
  
  // MARK: - Audio Loading
  
  @objc
  func loadAudioInService(_ audioPath: String, surah: String, reciter: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    NSLog("📂 [QuranAudioService] Chargement audio: \(surah) par \(reciter)")
    
    guard let url = URL(string: audioPath) ?? URL(fileURLWithPath: audioPath) as URL? else {
      reject("INVALID_PATH", "Chemin audio invalide", nil)
      return
    }
    
    do {
      // Arrêter l'audio en cours
      audioPlayer?.stop()
      updateTimer?.invalidate()
      
      // Créer le nouveau lecteur
      audioPlayer = try AVAudioPlayer(contentsOf: url)
      audioPlayer?.delegate = self
      audioPlayer?.prepareToPlay()
      
      currentAudioPath = audioPath
      currentSurah = surah
      currentReciter = reciter
      totalDuration = audioPlayer?.duration ?? 0
      currentPosition = 0
      
      // Mettre à jour Now Playing Info
      updateNowPlayingInfo()
      
      NSLog("✅ [QuranAudioService] Audio chargé: \(surah)")
      resolve(true)
      
      // Émettre l'événement de changement d'état
      sendAudioStateChangedEvent()
    } catch {
      NSLog("❌ [QuranAudioService] Erreur chargement: \(error)")
      reject("LOAD_ERROR", "Erreur chargement audio", error)
    }
  }
  
  @objc
  func loadSurahByNumber(_ surahNumber: Int, autoPlay: Bool, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    NSLog("📖 [QuranAudioService] Chargement sourate #\(surahNumber)")
    
    // TODO: Implémenter le chargement depuis le stockage local
    // Pour l'instant, on retourne simplement false
    resolve(false)
  }
  
  // MARK: - Playback Control
  
  @objc
  func playAudio(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let player = audioPlayer else {
      reject("NO_AUDIO", "Aucun audio chargé", nil)
      return
    }
    
    NSLog("▶️ [QuranAudioService] Lecture audio")
    
    player.play()
    isPlaying = true
    
    // Démarrer le timer de mise à jour
    startUpdateTimer()
    
    // Mettre à jour Now Playing Info
    updateNowPlayingInfo()
    
    sendAudioStateChangedEvent()
    resolve(true)
  }
  
  @objc
  func pauseAudio(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let player = audioPlayer else {
      reject("NO_AUDIO", "Aucun audio chargé", nil)
      return
    }
    
    NSLog("⏸️ [QuranAudioService] Pause audio")
    
    player.pause()
    isPlaying = false
    currentPosition = player.currentTime
    
    // Arrêter le timer
    updateTimer?.invalidate()
    
    // Mettre à jour Now Playing Info
    updateNowPlayingInfo()
    
    sendAudioStateChangedEvent()
    resolve(true)
  }
  
  @objc
  func stopAudio(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    NSLog("⏹️ [QuranAudioService] Arrêt audio")
    
    audioPlayer?.stop()
    audioPlayer = nil
    isPlaying = false
    currentPosition = 0
    totalDuration = 0
    
    updateTimer?.invalidate()
    
    // Effacer Now Playing Info
    MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
    
    sendAudioStateChangedEvent()
    resolve(true)
  }
  
  @objc
  func seekToPosition(_ position: Int, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let player = audioPlayer else {
      reject("NO_AUDIO", "Aucun audio chargé", nil)
      return
    }
    
    let newTime = TimeInterval(position) / 1000.0
    player.currentTime = newTime
    currentPosition = newTime
    
    updateNowPlayingInfo()
    sendAudioStateChangedEvent()
    
    resolve(true)
  }
  
  // MARK: - Premium & Auth
  
  @objc
  func updatePremiumStatus(_ isPremiumUser: Bool, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    NSLog("💎 [QuranAudioService] Mise à jour statut premium: \(isPremiumUser)")
    
    isPremium = isPremiumUser
    
    sendEvent(withName: "PremiumStatusChanged", body: ["isPremium": isPremium])
    
    resolve(true)
  }
  
  @objc
  func syncAuthToken(_ token: String) {
    NSLog("🔑 [QuranAudioService] Synchronisation token auth")
    authToken = token
  }
  
  // MARK: - State Management
  
  @objc
  func getCurrentState(_ resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    let state: [String: Any] = [
      "isServiceRunning": audioPlayer != nil,
      "isPlaying": isPlaying,
      "currentTitle": currentSurah ?? "",
      "currentReciter": currentReciter ?? "",
      "currentPosition": Int(currentPosition * 1000),
      "totalDuration": Int(totalDuration * 1000),
      "isPremium": isPremium
    ]
    
    resolve(state)
  }
  
  // MARK: - Navigation (Stubs)
  
  @objc
  func navigateToNextSurah(_ resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    NSLog("⏭️ [QuranAudioService] navigateToNextSurah (stub)")
    resolve(false)
  }
  
  @objc
  func navigateToPreviousSurah(_ resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    NSLog("⏮️ [QuranAudioService] navigateToPreviousSurah (stub)")
    resolve(false)
  }
  
  // MARK: - Auto Advance & Loop
  
  @objc
  func setAutoAdvanceEnabled(_ enabled: Bool, resolver resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    autoAdvanceEnabled = enabled
    resolve(true)
  }
  
  @objc
  func setLoopEnabled(_ enabled: Bool, resolver resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    loopEnabled = enabled
    audioPlayer?.numberOfLoops = enabled ? -1 : 0
    resolve(true)
  }
  
  @objc
  func isAutoAdvanceEnabled(_ resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    resolve(autoAdvanceEnabled)
  }
  
  @objc
  func isLoopEnabled(_ resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    resolve(loopEnabled)
  }
  
  // MARK: - Downloaded Surahs (Stubs)
  
  @objc
  func getDownloadedSurahs(_ reciter: String, resolver resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    NSLog("📥 [QuranAudioService] getDownloadedSurahs (stub)")
    resolve([])
  }
  
  @objc
  func isSurahDownloaded(_ reciter: String, surahNumber: Int, resolver resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    NSLog("📥 [QuranAudioService] isSurahDownloaded (stub)")
    resolve(false)
  }
  
  // MARK: - Widget Sync (Stubs)
  
  @objc
  func getCurrentWidgetSurah(_ resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    resolve([:])
  }
  
  @objc
  func syncWithWidgetSurah(_ resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    resolve(false)
  }
  
  // MARK: - Remote Controls (Lock Screen)
  
  private func setupRemoteTransportControls() {
    let commandCenter = MPRemoteCommandCenter.shared()
    
    commandCenter.playCommand.addTarget { [weak self] event in
      self?.audioPlayer?.play()
      self?.isPlaying = true
      self?.sendAudioStateChangedEvent()
      return .success
    }
    
    commandCenter.pauseCommand.addTarget { [weak self] event in
      self?.audioPlayer?.pause()
      self?.isPlaying = false
      self?.sendAudioStateChangedEvent()
      return .success
    }
    
    commandCenter.nextTrackCommand.addTarget { [weak self] event in
      self?.sendEvent(withName: "AudioCompleted", body: ["reason": "next"])
      return .success
    }
    
    commandCenter.previousTrackCommand.addTarget { [weak self] event in
      self?.sendEvent(withName: "AudioCompleted", body: ["reason": "previous"])
      return .success
    }
  }
  
  private func updateNowPlayingInfo() {
    var nowPlayingInfo = [String: Any]()
    
    nowPlayingInfo[MPMediaItemPropertyTitle] = currentSurah ?? "Quran"
    nowPlayingInfo[MPMediaItemPropertyArtist] = currentReciter ?? "Récitateur"
    nowPlayingInfo[MPNowPlayingInfoPropertyElapsedPlaybackTime] = currentPosition
    nowPlayingInfo[MPMediaItemPropertyPlaybackDuration] = totalDuration
    nowPlayingInfo[MPNowPlayingInfoPropertyPlaybackRate] = isPlaying ? 1.0 : 0.0
    
    MPNowPlayingInfoCenter.default().nowPlayingInfo = nowPlayingInfo
  }
  
  // MARK: - Update Timer
  
  private func startUpdateTimer() {
    updateTimer?.invalidate()
    updateTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
      guard let self = self, let player = self.audioPlayer else { return }
      
      self.currentPosition = player.currentTime
      self.updateNowPlayingInfo()
      self.sendAudioStateChangedEvent()
    }
  }
  
  private func sendAudioStateChangedEvent() {
    let state: [String: Any] = [
      "isServiceRunning": audioPlayer != nil,
      "isPlaying": isPlaying,
      "currentTitle": currentSurah ?? "",
      "currentReciter": currentReciter ?? "",
      "currentPosition": Int(currentPosition * 1000),
      "totalDuration": Int(totalDuration * 1000)
    ]
    
    sendEvent(withName: "AudioStateChanged", body: state)
  }
}

// MARK: - AVAudioPlayerDelegate

extension QuranAudioServiceModule: AVAudioPlayerDelegate {
  func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
    NSLog("🏁 [QuranAudioService] Audio terminé")
    
    isPlaying = false
    currentPosition = 0
    
    sendEvent(withName: "AudioCompleted", body: ["successfully": flag])
    sendAudioStateChangedEvent()
  }
  
  func audioPlayerDecodeErrorDidOccur(_ player: AVAudioPlayer, error: Error?) {
    NSLog("❌ [QuranAudioService] Erreur décodage: \(error?.localizedDescription ?? "unknown")")
    
    sendEvent(withName: "AudioError", body: ["error": error?.localizedDescription ?? "Unknown error"])
  }
}
