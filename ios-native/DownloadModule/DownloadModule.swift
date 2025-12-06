import Foundation
import React

@objc(DownloadModule)
class DownloadModule: RCTEventEmitter {
  
  private var activeDownloads: [String: URLSessionDownloadTask] = [:]
  private var downloadProgress: [String: Double] = [:]
  private lazy var downloadSession: URLSession = {
    let config = URLSessionConfiguration.background(withIdentifier: "com.drogbinho.myadhan.downloads")
    config.isDiscretionary = false
    config.sessionSendsLaunchEvents = true
    return URLSession(configuration: config, delegate: self, delegateQueue: nil)
  }()
  
  // MARK: - React Native Event Emitter
  
  override static func requiresMainQueueSetup() -> Bool {
    return false
  }
  
  override func supportedEvents() -> [String]! {
    return [
      "DownloadProgress",
      "DownloadCompleted",
      "DownloadFailed",
      "DownloadCancelled"
    ]
  }
  
  // MARK: - Download Management
  
  @objc
  func startDownload(_ downloadInfo: [String: Any], resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let contentId = downloadInfo["contentId"] as? String,
          let url = downloadInfo["url"] as? String,
          let urlObject = URL(string: url) else {
      reject("INVALID_PARAMS", "contentId et url requis", nil)
      return
    }
    
    let title = downloadInfo["title"] as? String ?? "Unknown"
    let reciter = downloadInfo["reciter"] as? String ?? "Unknown"
    
    print("📥 [DownloadModule] Démarrage téléchargement: \(title) par \(reciter)")
    
    // Vérifier si le téléchargement est déjà actif
    if activeDownloads[contentId] != nil {
      reject("DOWNLOAD_EXISTS", "Téléchargement déjà en cours", nil)
      return
    }
    
    // Créer la tâche de téléchargement
    let downloadTask = downloadSession.downloadTask(with: urlObject)
    
    // Stocker les métadonnées
    downloadTask.taskDescription = contentId
    
    // Ajouter aux téléchargements actifs
    activeDownloads[contentId] = downloadTask
    downloadProgress[contentId] = 0.0
    
    // Démarrer le téléchargement
    downloadTask.resume()
    
    print("✅ [DownloadModule] Téléchargement démarré: \(contentId)")
    
    let result: [String: Any] = [
      "success": true,
      "contentId": contentId,
      "message": "Download started"
    ]
    
    resolve(result)
  }
  
  @objc
  func cancelDownload(_ contentId: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    print("🚫 [DownloadModule] Annulation téléchargement: \(contentId)")
    
    guard let downloadTask = activeDownloads[contentId] else {
      reject("NOT_FOUND", "Téléchargement non trouvé", nil)
      return
    }
    
    downloadTask.cancel()
    activeDownloads.removeValue(forKey: contentId)
    downloadProgress.removeValue(forKey: contentId)
    
    sendEvent(withName: "DownloadCancelled", body: ["contentId": contentId])
    
    print("✅ [DownloadModule] Téléchargement annulé: \(contentId)")
    resolve(true)
  }
  
  @objc
  func getDownloadStatus(_ contentId: String, resolver resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    if let task = activeDownloads[contentId] {
      let progress = downloadProgress[contentId] ?? 0.0
      let status: [String: Any] = [
        "status": "downloading",
        "progress": progress,
        "contentId": contentId
      ]
      resolve(status)
    } else {
      // Vérifier si le fichier est téléchargé
      let fileManager = FileManager.default
      let documentsPath = fileManager.urls(for: .documentDirectory, in: .userDomainMask)[0]
      let filePath = documentsPath.appendingPathComponent("premium_content/\(contentId).mp3")
      
      if fileManager.fileExists(atPath: filePath.path) {
        let status: [String: Any] = [
          "status": "completed",
          "progress": 1.0,
          "contentId": contentId,
          "localPath": filePath.path
        ]
        resolve(status)
      } else {
        let status: [String: Any] = [
          "status": "not_started",
          "progress": 0.0,
          "contentId": contentId
        ]
        resolve(status)
      }
    }
  }
  
  @objc
  func getActiveDownloads(_ resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    var activeDownloadsList: [[String: Any]] = []
    
    for (contentId, _) in activeDownloads {
      let progress = downloadProgress[contentId] ?? 0.0
      activeDownloadsList.append([
        "contentId": contentId,
        "progress": progress
      ])
    }
    
    resolve(activeDownloadsList)
  }
  
  @objc
  func isDownloadActive(_ contentId: String, resolver resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
    resolve(activeDownloads[contentId] != nil)
  }
  
  // MARK: - Helper Methods
  
  private func getDestinationPath(for contentId: String) -> URL {
    let fileManager = FileManager.default
    let documentsPath = fileManager.urls(for: .documentDirectory, in: .userDomainMask)[0]
    let premiumContentDir = documentsPath.appendingPathComponent("premium_content")
    
    // Créer le répertoire s'il n'existe pas
    if !fileManager.fileExists(atPath: premiumContentDir.path) {
      try? fileManager.createDirectory(at: premiumContentDir, withIntermediateDirectories: true)
    }
    
    return premiumContentDir.appendingPathComponent("\(contentId).mp3")
  }
}

// MARK: - URLSessionDownloadDelegate

extension DownloadModule: URLSessionDownloadDelegate {
  
  func urlSession(_ session: URLSession, downloadTask: URLSessionDownloadTask, didFinishDownloadingTo location: URL) {
    guard let contentId = downloadTask.taskDescription else { return }
    
    print("✅ [DownloadModule] Téléchargement terminé: \(contentId)")
    
    let destinationPath = getDestinationPath(for: contentId)
    
    do {
      // Supprimer l'ancien fichier s'il existe
      if FileManager.default.fileExists(atPath: destinationPath.path) {
        try FileManager.default.removeItem(at: destinationPath)
      }
      
      // Déplacer le fichier téléchargé
      try FileManager.default.moveItem(at: location, to: destinationPath)
      
      // Nettoyer
      activeDownloads.removeValue(forKey: contentId)
      downloadProgress.removeValue(forKey: contentId)
      
      // Émettre l'événement de succès
      sendEvent(withName: "DownloadCompleted", body: [
        "contentId": contentId,
        "localPath": destinationPath.path
      ])
      
      print("✅ [DownloadModule] Fichier sauvegardé: \(destinationPath.path)")
    } catch {
      print("❌ [DownloadModule] Erreur sauvegarde: \(error)")
      
      activeDownloads.removeValue(forKey: contentId)
      downloadProgress.removeValue(forKey: contentId)
      
      sendEvent(withName: "DownloadFailed", body: [
        "contentId": contentId,
        "error": error.localizedDescription
      ])
    }
  }
  
  func urlSession(_ session: URLSession, downloadTask: URLSessionDownloadTask, didWriteData bytesWritten: Int64, totalBytesWritten: Int64, totalBytesExpectedToWrite: Int64) {
    guard let contentId = downloadTask.taskDescription else { return }
    
    let progress = Double(totalBytesWritten) / Double(totalBytesExpectedToWrite)
    downloadProgress[contentId] = progress
    
    // Émettre l'événement de progression (throttle à 5%)
    if Int(progress * 100) % 5 == 0 {
      sendEvent(withName: "DownloadProgress", body: [
        "contentId": contentId,
        "progress": progress,
        "bytesWritten": totalBytesWritten,
        "totalBytes": totalBytesExpectedToWrite
      ])
    }
  }
  
  func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
    guard let error = error,
          let contentId = task.taskDescription else { return }
    
    print("❌ [DownloadModule] Erreur téléchargement \(contentId): \(error)")
    
    activeDownloads.removeValue(forKey: contentId)
    downloadProgress.removeValue(forKey: contentId)
    
    sendEvent(withName: "DownloadFailed", body: [
      "contentId": contentId,
      "error": error.localizedDescription
    ])
  }
}
