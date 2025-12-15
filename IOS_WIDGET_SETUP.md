# 🕌 Configuration du Widget iOS - Horaires de Prière

> ⚠️ **Note importante** : Le widget est **désactivé pour l'instant** car sa configuration nécessite Xcode.  
> Ce guide sera utilisé plus tard quand tu auras accès à un Mac avec Xcode (ou un Mac cloud).

Ce guide explique comment finaliser la configuration du widget iOS pour afficher les horaires de prière sur l'écran d'accueil.

## 📋 Prérequis

- ✅ Code du widget déjà créé dans `plugins/withPrayerTimesWidget.js` et fichier Swift prêt
- ⏳ App Group à configurer : `group.com.drogbinho.myadhan` (via Xcode)
- ✅ `AdhanModule.swift` déjà modifié pour partager les données (prêt à être activé)

## 🔓 **Quand activer le widget ?**

Tu pourras activer le widget plus tard en suivant ces options :

1. **Option Mac personnel** : Si tu as accès à un Mac avec Xcode
2. **Option Mac cloud** : Loue un Mac cloud pour 1-2h (~5-10€)
   - [MacStadium](https://www.macstadium.com/)
   - [AWS Mac instances](https://aws.amazon.com/ec2/instance-types/mac/)
   - [MacinCloud](https://www.macincloud.com/)
3. **Option collaboration** : Demande à quelqu'un avec Xcode de le configurer

**Une fois configuré dans Xcode**, décommente simplement le plugin dans `app.json` :

```json
"./plugins/withPrayerTimesWidget.js",
```

---

## 🚀 Étapes de configuration

### Étape 1 : Ouvrir le projet dans Xcode

```bash
cd ios
open MyAdhanMuslimPrayerApp.xcworkspace
```

### Étape 2 : Ajouter le Widget Extension Target

1. Dans Xcode, cliquez sur **File** → **New** → **Target**
2. Sélectionnez **Widget Extension**
3. Configurez comme suit :
   - **Product Name** : `PrayerTimesWidget`
   - **Team** : Votre équipe de développement
   - **Organization Identifier** : `com.drogbinho`
   - **Bundle Identifier** : `com.drogbinho.myadhan.PrayerTimesWidget` (**IMPORTANT**)
   - **Language** : Swift
   - **Include Configuration Intent** : Non
4. Cliquez sur **Finish**
5. Quand Xcode demande **"Activate "PrayerTimesWidget" scheme?"**, cliquez sur **Activate**

### Étape 3 : Remplacer le code du widget

1. Dans le navigateur de projet Xcode, trouvez le dossier **PrayerTimesWidget**
2. Supprimez les fichiers générés automatiquement :
   - `PrayerTimesWidget.swift` (l'ancien)
   - `PrayerTimesWidgetBundle.swift` (si présent)
3. Glissez-déposez le fichier `ios/PrayerTimesWidget/PrayerTimesWidget.swift` dans le dossier du widget dans Xcode
4. Assurez-vous de cocher **"Copy items if needed"** et **"Create groups"**

### Étape 4 : Configurer l'App Group pour le Widget

1. Sélectionnez le **PrayerTimesWidget Target** dans le navigateur de projet
2. Allez dans l'onglet **Signing & Capabilities**
3. Cliquez sur **+ Capability**
4. Ajoutez **App Groups**
5. Cochez **group.com.drogbinho.myadhan**

### Étape 5 : Vérifier l'App Group de l'app principale

1. Sélectionnez le **MyAdhanMuslimPrayerApp Target** (l'app principale)
2. Allez dans **Signing & Capabilities**
3. Vérifiez que **App Groups** est présent avec **group.com.drogbinho.myadhan**
4. Si ce n'est pas le cas, ajoutez-le comme à l'étape 4

### Étape 6 : Tester le widget

1. Sélectionnez le scheme **PrayerTimesWidget** en haut de Xcode
2. Choisissez un simulateur iOS 14+ ou votre appareil
3. Appuyez sur **Run** (⌘R)
4. Le simulateur/appareil va s'ouvrir avec une preview du widget
5. Ajoutez le widget à l'écran d'accueil :
   - **Simulateur** : Longue pression sur l'écran d'accueil → **+** → Recherchez "Prayer Times"
   - **Appareil réel** : Même chose

### Étape 7 : Build pour production (EAS Build)

Le widget sera automatiquement inclus dans le build EAS grâce au plugin Expo.

```bash
eas build --profile preview --platform ios
```

## 🎨 Fonctionnalités du Widget

### Tailles supportées

- **Small** (petit carré) : Prochaine prière + horaire
- **Medium** (rectangle) : Liste des 6 horaires du jour
- **Large** (grand rectangle) : Liste complète + dua/dhikr

### Mise à jour automatique

- Le widget se met à jour **toutes les 15 minutes**
- Il se met à jour **immédiatement** quand l'app sauvegarde de nouveaux horaires
- Il change de couleur selon l'heure de la journée :
  - 🌙 **Nuit (0h-5h)** : Bleu foncé
  - 🌅 **Fajr (5h-7h)** : Mauve aube
  - 🌤️ **Matin (7h-12h)** : Bleu clair
  - ☀️ **Midi (12h-15h)** : Jaune/Orange
  - 🌤️ **Après-midi (15h-18h)** : Orange
  - 🌆 **Maghrib (18h-20h)** : Rose/Violet
  - 🌙 **Soirée (20h-0h)** : Bleu nuit

### Affichage

- 🕌 **Titre** : "Horaires de Prière"
- ⏰ **Prochaine prière** : Mise en évidence avec fond semi-transparent
- 📋 **Liste des prières** :
  - 🌅 Fajr
  - 🌄 Lever du Soleil
  - ☀️ Dhuhr
  - 🌤️ Asr
  - 🌆 Maghrib
  - 🌙 Isha
- ✨ **Prière actuelle** : Affichée en jaune

## 🐛 Dépannage

### Le widget affiche "00:00" ou est vide

**Cause** : Les horaires ne sont pas sauvegardés dans l'App Group.

**Solution** :

1. Ouvrez l'app principale
2. Allez dans les paramètres
3. Changez la méthode de calcul ou la localisation (pour forcer une mise à jour)
4. Le widget devrait se mettre à jour automatiquement

### Le widget ne se met pas à jour

**Cause** : App Group mal configuré.

**Solution** :

1. Vérifiez que les deux targets (app + widget) ont le même App Group ID
2. Nettoyez le build : **Product** → **Clean Build Folder** (⇧⌘K)
3. Rebuild

### Erreur de signature

**Cause** : Bundle Identifier incorrect.

**Solution** :

1. App principale : `com.drogbinho.myadhan`
2. Widget : `com.drogbinho.myadhan.PrayerTimesWidget`
3. App Group : `group.com.drogbinho.myadhan`

## 📱 Test sur appareil réel

Pour tester sur un vrai iPhone :

1. Connectez votre iPhone
2. Sélectionnez-le comme destination dans Xcode
3. Run l'app principale d'abord
4. Ajoutez le widget sur l'écran d'accueil
5. Ouvrez l'app pour charger les horaires
6. Le widget devrait afficher les horaires immédiatement

## ✅ Checklist finale

- [ ] Widget Extension créé dans Xcode
- [ ] Code du widget copié
- [ ] App Group configuré sur les 2 targets
- [ ] Widget testé sur simulateur
- [ ] Widget testé sur appareil réel
- [ ] Horaires s'affichent correctement
- [ ] Mise à jour automatique fonctionne
- [ ] Couleurs changent selon l'heure

## 🎯 Prochaines améliorations possibles

- [ ] Ajouter des intentions pour configurer le widget (taille de police, couleurs, etc.)
- [ ] Support du mode sombre
- [ ] Afficher un dhikr/dua aléatoire dans le widget Large
- [ ] Animation lors du changement de prière
- [ ] Notification quand on appuie sur le widget (ouvre l'app à la bonne page)

---

**Besoin d'aide ?** Consultez la documentation Apple sur les Widgets : https://developer.apple.com/widgets/
