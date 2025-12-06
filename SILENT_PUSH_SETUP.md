# 🔔 Configuration des Silent Push Notifications iOS

Ce guide explique comment configurer les Silent Push Notifications pour reprogrammer automatiquement les notifications d'Adhan sur iOS, sans que l'utilisateur ait besoin d'ouvrir l'app.

---

## 📋 PRÉREQUIS

- ✅ Compte Firebase (gratuit)
- ✅ Serveur PHP Infomaniak (vous l'avez déjà)
- ✅ Certificat Apple Developer (vous l'avez déjà)
- ✅ Accès au cPanel Infomaniak

---

## 🔥 ÉTAPE 1 : CONFIGURATION FIREBASE

### 1.1 Créer un projet Firebase

1. Aller sur https://console.firebase.google.com/
2. Cliquer sur **"Ajouter un projet"**
3. Nom du projet : `MyAdhan` (ou ce que vous voulez)
4. Désactiver Google Analytics (pas nécessaire)
5. Cliquer sur **"Créer le projet"**

### 1.2 Ajouter l'application iOS

1. Dans le projet Firebase, cliquer sur l'icône **iOS** (ou **"Ajouter une application"**)
2. **Bundle ID** : `com.drogbinho.myadhan` (votre bundle ID actuel)
3. **Surnom de l'app** (optionnel) : `MyAdhan iOS`
4. **App Store ID** (optionnel) : Laisser vide pour l'instant
5. Cliquer sur **"Enregistrer l'app"**

### 1.3 Télécharger GoogleService-Info.plist

1. Firebase vous propose de télécharger `GoogleService-Info.plist`
2. **IMPORTANT** : Téléchargez ce fichier et gardez-le précieusement
3. Vous devrez l'ajouter à votre projet iOS lors du prochain build

### 1.4 Configurer les APNs (Apple Push Notification service)

1. Dans Firebase Console, aller dans **Paramètres du projet** (⚙️ en haut à gauche)
2. Onglet **"Cloud Messaging"**
3. Section **"Certificats APNs"** (iOS)
4. Cliquer sur **"Importer le certificat"**
5. Uploader votre **certificat .p12** (ou clé .p8)
   
   **Comment obtenir ce certificat ?**
   - Aller sur https://developer.apple.com/account/
   - **Certificates, Identifiers & Profiles** > **Keys**
   - Créer une nouvelle clé avec **Apple Push Notifications service (APNs)**
   - Télécharger le fichier `.p8`
   - Dans Firebase, uploader ce fichier

### 1.5 Récupérer la Server Key

1. Toujours dans **Cloud Messaging**
2. Section **"API Cloud Messaging (héritée)"**
3. Copier la **"Clé du serveur"** (commence par `AAAA...`)
4. **IMPORTANT** : Gardez cette clé secrète !

---

## 🖥️ ÉTAPE 2 : CONFIGURATION DU SERVEUR PHP

### 2.1 Ajouter la clé Firebase dans .env

Sur votre serveur Infomaniak, éditez le fichier `.env` et ajoutez :

```env
# Firebase Cloud Messaging
FIREBASE_SERVER_KEY=AAAA...votre_cle_serveur_ici
CRON_SECRET=CHANGEZ_CE_SECRET_PAR_QUELQUE_CHOSE_DUNIQUE_123456
```

**Où trouver le fichier .env ?**
- Chemin : `/home/votre-user/public_html/.env`
- Si le fichier n'existe pas, créez-le

### 2.2 Vérifier les permissions

```bash
chmod 600 .env  # Seulement vous pouvez lire/écrire
chmod 755 api/cron/  # Dossier exécutable
chmod 755 api/cron/send-silent-push.php  # Script exécutable
```

### 2.3 Tester le script manuellement

```bash
# En SSH
cd /home/votre-user/public_html
php api/cron/send-silent-push.php
```

Ou via navigateur :
```
https://myadhanapp.com/api/cron/send-silent-push.php?secret=VOTRE_SECRET
```

**Résultat attendu :**
```
✅ SUCCÈS ! Notification envoyée avec succès
📊 STATISTIQUES :
   • Code HTTP : 200
   • Message ID : 0:123456789...
   • Succès : 1
```

---

## ⏰ ÉTAPE 3 : CONFIGURATION DU CRON (cPanel)

### 3.1 Accéder au Cron Manager

1. Connexion au **cPanel Infomaniak**
2. Chercher **"Tâches cron"** ou **"Cron Jobs"**
3. Cliquer dessus

### 3.2 Créer une nouvelle tâche cron

**Fréquence recommandée :** Tous les jours à minuit (00:00)

```
Minute : 0
Heure : 0
Jour : *
Mois : *
Jour de la semaine : *
```

**Commande :**
```bash
/usr/bin/php /home/votre-user/public_html/api/cron/send-silent-push.php
```

**OU** (si PHP CLI indisponible) :
```bash
curl "https://myadhanapp.com/api/cron/send-silent-push.php?secret=VOTRE_SECRET"
```

### 3.3 Tester la tâche cron

Après création, vous pouvez :
1. Attendre minuit le lendemain 😴
2. OU modifier temporairement l'heure pour dans 5 minutes
3. Vérifier les logs dans `api/logs/silent-push.log`

---

## 📱 ÉTAPE 4 : CONFIGURATION DE L'APP iOS

### 4.1 Ajouter GoogleService-Info.plist au projet

**Si vous utilisez EAS Build (Expo)** :

1. Créer le dossier `ios/` à la racine du projet (s'il n'existe pas)
2. Y placer le fichier `GoogleService-Info.plist`
3. Modifier `app.json` pour inclure le fichier :

```json
{
  "expo": {
    "ios": {
      "googleServicesFile": "./ios/GoogleService-Info.plist"
    }
  }
}
```

### 4.2 Activer les Background Modes

Dans `app.json`, vérifier que vous avez :

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "UIBackgroundModes": [
          "remote-notification",  // ← IMPORTANT pour Silent Push
          "fetch"
        ]
      }
    }
  }
}
```

### 4.3 Rebuild l'app iOS

```bash
eas build --profile preview --platform ios
```

---

## 🧪 ÉTAPE 5 : TESTER

### 5.1 Test manuel depuis l'app

1. Ouvrir l'app sur iPhone
2. Aller dans **Debug** > **Test Sauvegarde Complète**
3. Vérifier les logs

### 5.2 Test du CRON

```bash
# En SSH
php /home/votre-user/public_html/api/cron/send-silent-push.php
```

### 5.3 Vérifier les logs

**Sur le serveur :**
```bash
cat /home/votre-user/public_html/api/logs/silent-push.log
```

**Sur l'iPhone (via 3uTools) :**
Chercher les logs :
```
🔔 [PushNotifications] Silent Push reçu en arrière-plan
🔄 [PushNotifications] Reprogrammation démarrée...
✅ [PushNotifications] Notifications reprogrammées avec succès
```

---

## 📊 FLUX COMPLET

```
┌─────────────────────────────────────────────────────────────┐
│  1. CRON (Minuit) sur serveur Infomaniak                  │
│     └─► api/cron/send-silent-push.php                     │
│         └─► POST https://fcm.googleapis.com/fcm/send       │
│             {                                               │
│               "to": "/topics/ios_notifications",           │
│               "data": {"action": "refresh_notifications"}  │
│             }                                               │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Firebase Cloud Messaging (FCM)                         │
│     └─► Distribue aux abonnés du topic                    │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Tous les iPhones abonnés reçoivent le push            │
│     • App fermée → se réveille en arrière-plan (15 sec)   │
│     • App ouverte → traite immédiatement                   │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Chaque iPhone exécute LOCALEMENT :                     │
│     └─► Lit SES settings (position, son, méthode...)      │
│     └─► Calcule SES horaires de prière                    │
│     └─► Programme SES notifications (3 jours)             │
└─────────────────────────────────────────────────────────────┘
```

---

## ❓ DÉPANNAGE

### Problème : "FIREBASE_SERVER_KEY non définie"

**Solution :**
```bash
# Vérifier le .env
cat /home/votre-user/public_html/.env

# Ajouter la clé si manquante
echo "FIREBASE_SERVER_KEY=AAAA..." >> .env
```

### Problème : Code HTTP 401

**Cause :** Clé Firebase invalide

**Solution :**
1. Retourner dans Firebase Console
2. Copier à nouveau la Server Key
3. Mettre à jour le `.env`

### Problème : Les notifications ne se reprogramment pas

**Causes possibles :**
1. L'iPhone n'est pas abonné au topic → Réinstaller l'app
2. Le CRON ne s'exécute pas → Vérifier les logs cPanel
3. La clé APNs n'est pas configurée dans Firebase

### Problème : "Permission refusée" sur iOS

**Solution :**
L'utilisateur doit autoriser les notifications :
- iOS Réglages > MyAdhan > Notifications > **Autoriser**

---

## 📈 STATISTIQUES

Vous pouvez suivre les envois dans :
- **Logs serveur** : `api/logs/silent-push.log`
- **Firebase Console** : Cloud Messaging > Rapports

---

## 🎯 RÉSULTAT ATTENDU

Après configuration complète :

✅ Chaque nuit à minuit, le serveur envoie UN push  
✅ Tous les iPhones se réveillent et reprogramment LEURS notifications  
✅ Chaque utilisateur iOS a SES horaires personnalisés  
✅ Les notifications fonctionnent pendant 3 jours même si l'app n'est pas ouverte  
✅ Après 3 jours, nouveau push pour prolonger  
✅ **L'utilisateur n'a RIEN à faire !**

---

## 💰 COÛT

**TOTAL : 0€**
- Firebase Cloud Messaging : **GRATUIT** (jusqu'à des millions de notifications)
- Serveur PHP : **Déjà payé** (Infomaniak)
- Certificat Apple : **Déjà payé** (99$/an)

---

## 📞 SUPPORT

En cas de problème, vérifiez :
1. Les logs serveur (`api/logs/silent-push.log`)
2. Les logs iPhone (3uTools ou Console.app sur Mac)
3. Firebase Console > Cloud Messaging > Rapports

**Bon courage ! 🚀**

