import Foundation
import UserNotifications
import UIKit
import React

/**
 * Délégué pour capturer les événements de notification
 * Permet de voir ce qui se passe quand la notification arrive vraiment
 * Les logs sont capturés et exposés à React Native
 */
class NotificationDelegate: NSObject, UNUserNotificationCenterDelegate {
    
    static let shared = NotificationDelegate()
    
    // 📋 Buffer pour stocker les logs et les exposer à React Native
    private var capturedLogs: [String] = []
    private let maxLogs = 100 // Garder les 100 derniers logs
    
    private override init() {
        super.init()
    }
    
    // 📝 Ajouter un log au buffer ET au NSLog
    private func addLog(_ message: String) {
        NSLog(message)
        capturedLogs.append(message)
        
        // Garder seulement les derniers logs
        if capturedLogs.count > maxLogs {
            capturedLogs.removeFirst(capturedLogs.count - maxLogs)
        }
    }
    
    // 📖 Récupérer les logs capturés (exposé à React Native)
    func getCapturedLogs() -> [String] {
        return capturedLogs
    }
    
    // 🗑️ Nettoyer les logs
    func clearCapturedLogs() {
        capturedLogs.removeAll()
    }
    
    // 🔔 Quand une notification arrive PENDANT que l'app est ouverte (foreground)
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        addLog("═══════════════════════════════════════════")
        addLog("🔔 [NotificationDelegate] Notification ARRIVES (app ouverte)")
        addLog("═══════════════════════════════════════════")
        
        let content = notification.request.content
        addLog("📋 Titre: \(content.title)")
        addLog("📋 Corps: \(content.body)")
        addLog("📋 Catégorie: \(content.categoryIdentifier)")
        
        // 🎵 NOUVEAU : Si c'est une notification d'Adhan, lancer le MP3 complet immédiatement
        // Car iOS arrête le son .caf quand la notification disparaît de l'écran
        if let notificationType = content.userInfo["type"] as? String,
           notificationType == "adhan",
           let soundName = content.userInfo["soundName"] as? String,
           let prayer = content.userInfo["prayer"] as? String {
            
            addLog("🎵 [NotificationDelegate] Notification Adhan détectée en foreground")
            addLog("🎵 Son: \(soundName)")
            addLog("🕌 Prière: \(prayer)")
            addLog("💡 iOS va jouer le .caf, puis on lancera le MP3 complet pour continuer")
            
            // Émettre un événement vers React Native pour lancer le MP3 complet
            // On attend un peu pour laisser le .caf commencer à jouer
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                // Utiliser NotificationCenter pour émettre une notification système
                // qui sera capturée par AdhanAudioPlayer et transmise à React Native
                NotificationCenter.default.post(
                    name: NSNotification.Name("AdhanNotificationReceived"),
                    object: nil,
                    userInfo: [
                        "soundName": soundName,
                        "prayer": prayer
                    ]
                )
                self.addLog("✅ [NotificationDelegate] Notification système AdhanNotificationReceived postée")
            }
        }
        
        // Vérifier le son
        if let sound = content.sound {
            addLog("🎵 Son configuré: \(sound)")
            
            // Extraire le nom du fichier si possible
            let soundName = String(describing: sound)
            addLog("🎵 Description du son: \(soundName)")
            
            if soundName.contains(".caf") {
                addLog("✅ Son personnalisé .caf détecté (format natif iOS)")
            } else if soundName.contains("default") {
                addLog("⚠️ Son par défaut détecté (le fichier .caf n'a pas été chargé)")
            }
        } else {
            addLog("❌ AUCUN son configuré sur la notification!")
        }
        
        addLog("💡 iOS va maintenant essayer de jouer le son...")
        addLog("═══════════════════════════════════════════")
        
        // Afficher la notification avec son
        completionHandler([.banner, .sound, .badge])
    }
    
    // 👆 Quand l'utilisateur CLIQUE sur une notification
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        addLog("👆 [NotificationDelegate] Utilisateur a cliqué sur notification")
        
        let notification = response.notification
        let content = notification.request.content
        
        addLog("📋 Type: \(content.userInfo["type"] ?? "unknown")")
        addLog("🕌 Prière: \(content.userInfo["prayer"] ?? "unknown")")
        
        completionHandler()
    }
}

