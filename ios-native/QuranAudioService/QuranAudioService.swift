import Foundation
import AVFoundation
import MediaPlayer
import React

@objc(QuranAudioServiceModule)
class QuranAudioServiceModule: RCTEventEmitter {
  
  private var player: AVPlayer?
  private var playerItem: AVPlayerItem?
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
  
  private var timeObserverToken: Any?
  
  // MARK: - React Native Event Emitter
  
  override static func requiresMainQueueSetup() -> Bool {
    return true
  }
  
  override var methodQueue: DispatchQueue {
    return DispatchQueue.main
  }
  
  override func supportedEvents() -> [String]! {
    return [
      "AudioStateChanged",
      "AudioCompleted",
      "AudioError",
      "PremiumStatusChanged",
      "NativeDebugLog" // 🚀 NOUVEAU : Pour voir les logs Swift dans l'app JS
    ]
  }
  
  private func sendDebugLog(_ message: String) {
    NSLog("📝 [QuranService] \(message)")
    sendEvent(withName: "NativeDebugLog", body: [
        "message": message,
        "timestamp": Date().timeIntervalSince1970,
        "source": "Swift"
    ])
  }
  
  // MARK: - Service Lifecycle
  
  @objc
  func startAudioService(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    sendDebugLog("🚀 Démarrage service audio iOS")
    
    do {
      let audioSession = AVAudioSession.sharedInstance()
      try audioSession.setCategory(.playback, mode: .default, options: [])
      try audioSession.setActive(true)
      
      setupRemoteTransportControls()
      
      sendDebugLog("✅ Service audio configuré et actif")
      resolve(true)
    } catch {
      sendDebugLog("❌ Erreur démarrage: \(error.localizedDescription)")
      reject("START_ERROR", "Erreur démarrage service audio", error)
    }
  }
  
  @objc
  func stopAudioService(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    sendDebugLog("🛑 Arrêt service audio demandé")
    stopAudio(resolve, rejecter: reject)
    try? AVAudioSession.sharedInstance().setActive(false)
  }
  
  // MARK: - Audio Loading
  
  @objc
  func loadAudioInService(_ audioPath: String, surah: String, reciter: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    sendDebugLog("📂 Chargement: \(surah) - \(reciter)")
    
    let url: URL?
    if audioPath.hasPrefix("http") {
        // C'est une URL web
        if let encodedPath = audioPath.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) {
            url = URL(string: encodedPath)
        } else {
            url = URL(string: audioPath)
        }
    } else {
        // C'est un chemin de fichier local
        let cleanPath = audioPath.replacingOccurrences(of: "file://", with: "")
        
        // 🎯 Vérifier plusieurs variantes de chemin pour iOS
        if FileManager.default.fileExists(atPath: cleanPath) {
            sendDebugLog("📁 Fichier local trouvé: \(cleanPath)")
            url = URL(fileURLWithPath: cleanPath)
        } else {
            // Tenter de reconstruire le chemin si c'est un chemin relatif au dossier Documents
            let documentsPath = NSSearchPathForDirectoriesInDomains(.documentDirectory, .userDomainMask, true)[0]
            let fileName = (cleanPath as NSString).lastPathComponent
            let folderName = (cleanPath as NSString).deletingLastPathComponent.components(separatedBy: "/").last ?? ""
            let alternativePath = "\(documentsPath)/\(folderName)/\(fileName)"
            
            if FileManager.default.fileExists(atPath: alternativePath) {
                sendDebugLog("📁 Fichier trouvé via chemin alternatif: \(alternativePath)")
                url = URL(fileURLWithPath: alternativePath)
            } else {
                sendDebugLog("❌ Fichier local introuvable: \(cleanPath)")
                url = URL(fileURLWithPath: cleanPath)
            }
        }
    }
    
    guard let finalUrl = url else {
      sendDebugLog("❌ URL invalide: \(audioPath)")
      reject("INVALID_PATH", "Chemin audio invalide", nil)
      return
    }
    
    // 🛡️ NETTOYAGE CRITIQUE POUR ÉVITER LE CRASH
    removeTimeObserver()
    if let oldItem = playerItem {
        NotificationCenter.default.removeObserver(self, name: .AVPlayerItemDidPlayToEndTime, object: oldItem)
        oldItem.removeObserver(self, forKeyPath: "status")
        sendDebugLog("🧹 Anciens observateurs nettoyés")
    }
    player?.pause()
    
    // 🎯 S'assurer que la session audio est active et configurée pour la lecture
    do {
        let audioSession = AVAudioSession.sharedInstance()
        try audioSession.setCategory(.playback, mode: .default, options: [])
        try audioSession.setActive(true)
    } catch {
        sendDebugLog("⚠️ Erreur réactivation session: \(error.localizedDescription)")
    }
    
    do {
    let asset = AVURLAsset(url: finalUrl)
    playerItem = AVPlayerItem(asset: asset)
    
    // 🎯 Tenter de pré-charger la durée de manière asynchrone pour le streaming
    asset.loadValuesAsynchronously(forKeys: ["duration"]) { [weak self] in
        guard let self = self else { return }
        var error: NSError? = nil
        let status = asset.statusOfValue(forKey: "duration", error: &error)
        
        DispatchQueue.main.async {
            if status == .loaded {
                let duration = asset.duration
                if CMTIME_IS_VALID(duration) && !CMTIME_IS_INDEFINITE(duration) {
                    self.totalDuration = CMTimeGetSeconds(duration)
                    self.sendDebugLog("📏 Durée pré-chargée (asset): \(self.totalDuration)s")
                } else {
                    self.sendDebugLog("⏳ Durée asset indéterminée pour le moment")
                }
            } else {
                self.sendDebugLog("⚠️ Échec chargement durée asset: \(error?.localizedDescription ?? "status \(status.rawValue)")")
            }
            self.updateNowPlayingInfo()
            self.sendAudioStateChangedEvent()
        }
    }
    
    player = AVPlayer(playerItem: playerItem)
    
    // 🎯 Configurer le player pour une lecture fluide (laisser iOS gérer le buffer par défaut)
    player?.automaticallyWaitsToMinimizeStalling = true
    
    // Observer la fin de la lecture
    NotificationCenter.default.addObserver(self, selector: #selector(playerDidFinishPlaying), name: .AVPlayerItemDidPlayToEndTime, object: playerItem)
    
    // Observer le statut pour la durée (KVO)
    playerItem?.addObserver(self, forKeyPath: "status", options: [.old, .new], context: nil)
    
    currentAudioPath = audioPath
    currentSurah = surah
    currentReciter = reciter
    currentPosition = 0
    totalDuration = 0 // Réinitialiser la durée
    isPlaying = false // 🎯 Nouveau: réinitialiser l'état de lecture au chargement
    
    // 🎯 Tenter de récupérer la durée immédiatement pour les fichiers locaux
    if finalUrl.isFileURL {
        let asset = AVAsset(url: finalUrl)
        
        // Utiliser loadValuesAsynchronously même pour le local pour être sûr
        asset.loadValuesAsynchronously(forKeys: ["duration"]) { [weak self] in
            guard let self = self else { return }
            var error: NSError? = nil
            let status = asset.statusOfValue(forKey: "duration", error: &error)
            
            DispatchQueue.main.async {
                if status == .loaded {
                    let duration = asset.duration
                    if CMTIME_IS_VALID(duration) && !CMTIME_IS_INDEFINITE(duration) {
                        self.totalDuration = CMTimeGetSeconds(duration)
                        self.sendDebugLog("📏 Durée locale chargée (asset): \(self.totalDuration)s")
                        self.sendAudioStateChangedEvent()
                    }
                }
            }
        }
    }
    
    // 🎯 S'assurer que les événements sont envoyés sur le thread principal pour React Native
    DispatchQueue.main.async {
        self.addTimeObserver()
        self.updateNowPlayingInfo()
        
        self.sendDebugLog("✅ Audio chargé: \(finalUrl.isFileURL ? "LOCAL" : "STREAM")")
        resolve(true)
        self.sendAudioStateChangedEvent()
    }
    } catch {
      sendDebugLog("❌ Erreur init player: \(error.localizedDescription)")
      reject("LOAD_ERROR", "Erreur chargement audio", error)
    }
  }
  
  override func observeValue(forKeyPath keyPath: String?, of object: Any?, change: [NSKeyValueChangeKey : Any]?, context: UnsafeMutableRawPointer?) {
    if keyPath == "status" {
      if let item = object as? AVPlayerItem {
        sendDebugLog("ℹ️ Statut item: \(item.status.rawValue)")
        if item.status == .readyToPlay {
          let duration = item.duration
          if CMTIME_IS_VALID(duration) && !CMTIME_IS_INDEFINITE(duration) {
            totalDuration = CMTimeGetSeconds(duration)
            sendDebugLog("📏 Durée prête (KVO): \(totalDuration)s")
          } else {
             // 🎯 Tenter de récupérer via l'asset si l'item ne l'a pas
             let assetDuration = item.asset.duration
             if CMTIME_IS_VALID(assetDuration) && !CMTIME_IS_INDEFINITE(assetDuration) {
                 totalDuration = CMTimeGetSeconds(assetDuration)
                 sendDebugLog("📏 Durée prête (KVO fallback asset): \(totalDuration)s")
             } else if totalDuration <= 0 {
                sendDebugLog("⏳ Durée indéterminée KVO (item=\(CMTimeGetSeconds(duration))s, asset=\(CMTimeGetSeconds(assetDuration))s)")
             }
          }
          
          // 🎯 NOUVEAU : Forcer la lecture si isPlaying est vrai
          if self.isPlaying {
              sendDebugLog("▶️ Statut ReadyToPlay détecté alors que isPlaying=true, forçage lecture")
              self.player?.play()
          }
          
          updateNowPlayingInfo()
          sendAudioStateChangedEvent()
        } else if item.status == .failed {
          let error = item.error?.localizedDescription ?? "Erreur inconnue"
          sendDebugLog("❌ Échec chargement item: \(error)")
          sendEvent(withName: "AudioError", body: ["error": error])
        }
      }
    }
  }

  @objc private func playerDidFinishPlaying(notification: NSNotification) {
    sendDebugLog("🏁 Lecture terminée")
    isPlaying = false
    currentPosition = 0
    
    sendEvent(withName: "AudioCompleted", body: ["successfully": true])
    sendAudioStateChangedEvent()
  }

  @objc
  func loadSurahByNumber(_ surahNumber: Int, autoPlay: Bool, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    resolve(false)
  }

  // MARK: - Playback Control

  @objc
  func playAudio(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let player = player else {
      sendDebugLog("❌ Play impossible: aucun player")
      reject("NO_AUDIO", "Aucun audio chargé", nil)
      return
    }
    
    // 🎯 S'assurer que la session audio est active avant de jouer
    try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .default, options: [])
    try? AVAudioSession.sharedInstance().setActive(true)
    
    sendDebugLog("▶️ Lecture demandée...")
    isPlaying = true
    
    // 🎯 S'assurer que le son n'est pas coupé au niveau du player
    if player.volume == 0 {
        player.volume = 1.0
    }
    
    // 🎯 Utiliser playImmediately si on est déjà prêt, sinon play() s'en occupera quand prêt
    if player.status == .readyToPlay {
        sendDebugLog("▶️ Player prêt, lecture immédiate")
        player.playImmediately(atRate: 1.0)
    } else {
        sendDebugLog("▶️ Player non prêt, mise en file d'attente lecture")
        player.play()
    }
    
    updateNowPlayingInfo()
    sendAudioStateChangedEvent()
    resolve(true)
  }

  @objc
  func pauseAudio(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let player = player else {
      reject("NO_AUDIO", "Aucun audio chargé", nil)
      return
    }
    
    sendDebugLog("⏸️ Pause")
    player.pause()
    isPlaying = false
    currentPosition = CMTimeGetSeconds(player.currentTime())
    updateNowPlayingInfo()
    sendAudioStateChangedEvent()
    resolve(true)
  }

  @objc
  func stopAudio(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    sendDebugLog("⏹️ Stop")
    
    player?.pause()
    removeTimeObserver()
    
    if let item = playerItem {
        NotificationCenter.default.removeObserver(self, name: .AVPlayerItemDidPlayToEndTime, object: item)
        item.removeObserver(self, forKeyPath: "status")
    }
    
    player = nil
    playerItem = nil
    isPlaying = false
    currentPosition = 0
    totalDuration = 0
    
    MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
    sendAudioStateChangedEvent()
    resolve(true)
  }

  @objc
  func seekToPosition(_ position: Int, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let player = player else {
      reject("NO_AUDIO", "Aucun audio chargé", nil)
      return
    }
    
    let seconds = Double(position) / 1000.0
    let time = CMTime(seconds: seconds, preferredTimescale: 1000)
    
    player.seek(to: time) { [weak self] finished in
      if finished {
        self?.currentPosition = seconds
        self?.updateNowPlayingInfo()
        self?.sendAudioStateChangedEvent()
      }
    }
    
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
    // 🛡️ Protection critique contre NaN/Infinity
    let safePosition = currentPosition.isNaN || currentPosition.isInfinite ? 0 : currentPosition
    let safeDuration = totalDuration.isNaN || totalDuration.isInfinite ? 0 : totalDuration
    
    let state: [String: Any] = [
      "isServiceRunning": player != nil,
      "isPlaying": isPlaying,
      "currentTitle": currentSurah ?? "",
      "currentReciter": currentReciter ?? "",
      "currentPosition": safePosition, // 🎯 Harmonisation: secondes pour iOS
      "totalDuration": safeDuration,
      "isPremium": isPremium,
      "position": safePosition,
      "duration": safeDuration
    ]
    
    resolve(state)
  }

  // MARK: - Remote Controls (Lock Screen)

  private func setupRemoteTransportControls() {
    let commandCenter = MPRemoteCommandCenter.shared()
    
    // 🎯 Désactiver les commandes existantes pour éviter les doublons
    commandCenter.playCommand.removeTarget(nil)
    commandCenter.pauseCommand.removeTarget(nil)
    commandCenter.nextTrackCommand.removeTarget(nil)
    commandCenter.previousTrackCommand.removeTarget(nil)
    
    commandCenter.playCommand.isEnabled = true
    commandCenter.playCommand.addTarget { [weak self] event in
      guard let self = self else { return .commandFailed }
      self.sendDebugLog("Remote: Play")
      self.playAudio { _ in } rejecter: { _, _, _ in }
      return .success
    }
    
    commandCenter.pauseCommand.isEnabled = true
    commandCenter.pauseCommand.addTarget { [weak self] event in
      guard let self = self else { return .commandFailed }
      self.sendDebugLog("Remote: Pause")
      self.pauseAudio { _ in } rejecter: { _, _, _ in }
      return .success
    }
    
    commandCenter.nextTrackCommand.isEnabled = true
    commandCenter.nextTrackCommand.addTarget { [weak self] event in
      guard let self = self else { return .commandFailed }
      self.sendDebugLog("Remote: Next Surah")
      self.sendEvent(withName: "AudioCompleted", body: ["reason": "next"])
      return .success
    }
    
    commandCenter.previousTrackCommand.isEnabled = true
    commandCenter.previousTrackCommand.addTarget { [weak self] event in
      guard let self = self else { return .commandFailed }
      self.sendDebugLog("Remote: Previous Surah")
      self.sendEvent(withName: "AudioCompleted", body: ["reason": "previous"])
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
    
    // 🎯 Informer le système que nous supportons la navigation
    let commandCenter = MPRemoteCommandCenter.shared()
    commandCenter.nextTrackCommand.isEnabled = true
    commandCenter.previousTrackCommand.isEnabled = true
    commandCenter.playCommand.isEnabled = true
    commandCenter.pauseCommand.isEnabled = true
    
    MPNowPlayingInfoCenter.default().nowPlayingInfo = nowPlayingInfo
  }

  // MARK: - Time Observer

  private func addTimeObserver() {
    let interval = CMTime(seconds: 0.5, preferredTimescale: CMTimeScale(NSEC_PER_SEC))
    timeObserverToken = player?.addPeriodicTimeObserver(forInterval: interval, queue: .main) { [weak self] time in
      guard let self = self else { return }
      
      let newPosition = CMTimeGetSeconds(time)
      if !newPosition.isNaN && !newPosition.isInfinite {
          self.currentPosition = newPosition
      }
      
      // 🎯 Mettre à jour la durée si elle n'est pas encore connue
      if self.totalDuration <= 0, let item = self.playerItem {
          let duration = item.duration
            if CMTIME_IS_VALID(duration) && !CMTIME_IS_INDEFINITE(duration) {
                let durationSeconds = CMTimeGetSeconds(duration)
                if !durationSeconds.isNaN && !durationSeconds.isInfinite && durationSeconds > 0 {
                    self.totalDuration = durationSeconds
                    self.sendDebugLog("📏 Durée récupérée via observer: \(self.totalDuration)s")
                    self.sendAudioStateChangedEvent() // 🎯 Envoyer l'event immédiatement
                }
            }
      }
      
      self.updateNowPlayingInfo()
      self.sendAudioStateChangedEvent()
    }
  }

  private func removeTimeObserver() {
    if let token = timeObserverToken {
      player?.removeTimeObserver(token)
      timeObserverToken = nil
    }
  }

  private func sendAudioStateChangedEvent() {
    // 🎯 Tenter de récupérer la durée si elle est à 0
    if totalDuration <= 0, let item = playerItem {
      let duration = item.duration
      if CMTIME_IS_VALID(duration) && !CMTIME_IS_INDEFINITE(duration) {
        totalDuration = CMTimeGetSeconds(duration)
      }
    }
    
    // 🛡️ Protection critique contre NaN/Infinity qui fait crasher le bridge
    let safePosition = currentPosition.isNaN || currentPosition.isInfinite ? 0 : currentPosition
    let safeDuration = totalDuration.isNaN || totalDuration.isInfinite ? 0 : totalDuration
    
    // 🎯 Nouveau: Déterminer si on joue réellement (rate > 0) ou si on a demandé à jouer
    let effectivelyPlaying = (player?.rate ?? 0) > 0 || isPlaying
    
    // 🚀 DEBUG : Log vers la page de debug (via console JS)
    // On ne le fait pas à chaque tick car l'observer tourne à 0.5s, on le fait toutes les 2s
    if Int(safePosition) % 2 == 0 {
        NSLog("📊 [QuranService] State: \(effectivelyPlaying ? "PLAY" : "PAUSE") | \(safePosition)s / \(safeDuration)s")
    }

    let state: [String: Any] = [
      "isServiceRunning": player != nil,
      "isPlaying": effectivelyPlaying,
      "playerRate": player?.rate ?? 0,
      "currentTitle": currentSurah ?? "",
      "currentReciter": currentReciter ?? "",
      "position": safePosition, // 🎯 Envoyer en SECONDES (Double) pour iOS
      "duration": safeDuration,
      "currentPosition": safePosition,
      "totalDuration": safeDuration
    ]
    
    sendEvent(withName: "AudioStateChanged", body: state)
  }
}

