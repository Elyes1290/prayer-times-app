# 📱 Modules Natifs iOS - MyAdhan Muslim Prayer App

Ce dossier contient tous les modules natifs iOS implémentés en Swift pour assurer une parité fonctionnelle avec Android.

## 📦 Modules Disponibles

### 1. **AdhanModule** 🕌
Gestion des horaires de prière et notifications Adhan.

**Fonctionnalités:**
- Calcul des horaires de prière (utilise la bibliothèque Adhan)
- Programmation des notifications Adhan
- Sauvegarde de la localisation
- Gestion des paramètres de notification
- Synchronisation des données

**Méthodes principales:**
```swift
setLocation(lat: Double, lon: Double)
getSavedAutoLocation() -> Promise
calculatePrayerTimes(params: [String: Any]) -> Promise
scheduleAdhanAlarms(prayerTimes: [String: Any], adhanSound: String)
cancelAllAdhanAlarms()
saveNotificationSettings(settings: [String: Any])
```

**Dépendances:**
- `Adhan` (v1.3.0) - Calcul précis des horaires de prière

---

### 2. **QuranAudioServiceModule** 🎵
Service audio en arrière-plan avec contrôles écran verrouillé.

**Fonctionnalités:**
- Lecture audio en background (AVAudioSession)
- Contrôles écran verrouillé (MPNowPlayingInfoCenter)
- Mise à jour automatique des informations Now Playing
- Gestion premium et authentification
- Événements en temps réel vers React Native

**Méthodes principales:**
```swift
startAudioService() -> Promise
loadAudioInService(audioPath: String, surah: String, reciter: String) -> Promise
playAudio() -> Promise
pauseAudio() -> Promise
stopAudio() -> Promise
seekToPosition(position: Int) -> Promise
updatePremiumStatus(isPremium: Bool) -> Promise
getCurrentState() -> Promise
```

**Événements émis:**
- `AudioStateChanged` - Changement d'état de lecture
- `AudioCompleted` - Fin de la lecture
- `AudioError` - Erreur de lecture
- `PremiumStatusChanged` - Changement de statut premium

---

### 3. **DownloadModule** 📥
Téléchargement de fichiers en arrière-plan avec URLSession.

**Fonctionnalités:**
- Téléchargements en background (URLSessionDownloadTask)
- Suivi de progression en temps réel
- Gestion des fichiers téléchargés
- Sauvegarde dans le répertoire Documents

**Méthodes principales:**
```swift
startDownload(downloadInfo: [String: Any]) -> Promise
cancelDownload(contentId: String) -> Promise
getDownloadStatus(contentId: String) -> Promise
getActiveDownloads() -> Promise
isDownloadActive(contentId: String) -> Promise
```

**Événements émis:**
- `DownloadProgress` - Progression du téléchargement
- `DownloadCompleted` - Téléchargement terminé
- `DownloadFailed` - Échec du téléchargement
- `DownloadCancelled` - Téléchargement annulé

---

### 4. **QuranWidgetModule** 📱
Widget écran d'accueil avec WidgetKit.

**Fonctionnalités:**
- Widget iOS 14+ avec WidgetKit
- Partage de données via App Groups
- Synchronisation en temps réel avec l'app
- Mise à jour automatique du statut premium

**Méthodes principales:**
```swift
updateWidgetAudio(surah: String, reciter: String, audioPath: String) -> Promise
updateWidgetPlaybackState(isPlaying: Bool, position: Int, duration: Int) -> Promise
updateWidgetPremiumStatus(isPremium: Bool) -> Promise
forcePremiumStatus(isPremium: Bool) -> Promise
isWidgetAvailable() -> Promise
runDiagnostic() -> Promise
```

**App Group:**
- Identifiant: `group.com.drogbinho.myadhan`
- Utilisé pour partager les données entre l'app principale et le widget

---

## 🔧 Configuration Requise

### Info.plist
Les permissions suivantes doivent être configurées (déjà dans `app.json`):

```xml
<key>UIBackgroundModes</key>
<array>
  <string>audio</string>
  <string>location</string>
  <string>fetch</string>
</array>

<key>NSLocationWhenInUseUsageDescription</key>
<string>Nous avons besoin de votre localisation pour calculer les horaires de prière.</string>

<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>Nous avons besoin de votre localisation pour calculer les horaires de prière même en arrière-plan.</string>

<key>NSMicrophoneUsageDescription</key>
<string>Nous avons besoin d'accéder au microphone pour les fonctionnalités audio.</string>
```

### Capabilities
- **Background Modes**: Audio, Location, Fetch
- **Push Notifications**: Activé
- **App Groups**: `group.com.drogbinho.myadhan` (pour le widget)

---

## 📝 Intégration avec EAS Build

Les modules sont automatiquement intégrés lors du build EAS via le plugin Expo custom:

1. **Plugin Expo** (`plugins/withIosNativeModules.js`):
   - Copie tous les fichiers Swift/Objective-C dans le projet iOS
   - Ajoute la dépendance Adhan au Podfile
   - Configure automatiquement le projet

2. **Configuration `app.json`**:
```json
{
  "plugins": [
    ["./plugins/withIosNativeModules.js"]
  ]
}
```

3. **Build EAS**:
```bash
eas build --platform ios --profile preview
```

---

## 🆚 Parité Android/iOS

| Fonctionnalité | Android ✅ | iOS ✅ |
|----------------|-----------|-------|
| Calcul horaires prière | Native (Adhan) | Native (Adhan) |
| Notifications Adhan | AlarmManager | UNNotificationCenter |
| Audio en background | MediaPlayer + Service | AVAudioPlayer + AVAudioSession |
| Contrôles écran verrouillé | MediaSession | MPNowPlayingInfoCenter |
| Widget écran d'accueil | AppWidgetProvider | WidgetKit |
| Téléchargements | DownloadManager | URLSession |
| Sauvegarde locale | SharedPreferences | UserDefaults |
| Partage de données widget | SharedPreferences | App Groups |

---

## 🐛 Debugging

### Logs iOS
```swift
print("🎵 [QuranAudioService] Message de debug")
```

Visibles dans:
- Xcode Console (si connecté)
- 3uTools (section Logs)
- iPhone Analytics

### Vérification Widget
```swift
QuranWidgetModule.runDiagnostic()
  .then(diagnostic => console.log(diagnostic))
```

---

## 📚 Références

- [Adhan Swift Library](https://github.com/batoulapps/adhan-swift)
- [AVFoundation](https://developer.apple.com/documentation/avfoundation)
- [WidgetKit](https://developer.apple.com/documentation/widgetkit)
- [URLSession](https://developer.apple.com/documentation/foundation/urlsession)
- [React Native iOS Native Modules](https://reactnative.dev/docs/native-modules-ios)

---

## ✅ Statut

| Module | Implémentation | Tests | Documentation |
|--------|----------------|-------|---------------|
| AdhanModule | ✅ | ⏳ | ✅ |
| QuranAudioService | ✅ | ⏳ | ✅ |
| DownloadModule | ✅ | ⏳ | ✅ |
| QuranWidgetModule | ✅ | ⏳ | ✅ |

**Version**: 1.0.0  
**Date**: Novembre 2024  
**Auteur**: Assistant AI (Claude 3.5 Sonnet)
