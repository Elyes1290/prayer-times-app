# 📱 Guide du Système de Stockage Stratifié

## 🎯 Vue d'ensemble

Le nouveau système de stockage divise les données en **3 niveaux** selon leur importance et les règles de mode professionnel :

### 🟢 NIVEAU 1 : Données ESSENTIELLES

✅ **Toujours sauvegardées** (même en mode professionnel)

- Paramètres de fonctionnement de base (localisation, langue, thème)
- Préférences de prière (méthode calcul, son adhan, notifications)
- Paramètres dhikr et interface
- Favoris locaux (expérience utilisateur)

### 🟡 NIVEAU 2 : Données UTILISATEUR

🔐 **Mode professionnel** (connexion explicite uniquement)

- Prénom utilisateur
- Données de connexion
- Paramètres personnalisés

### 🔴 NIVEAU 3 : Données PREMIUM

💎 **Premium + connexion explicite** uniquement

- Données premium/cloud
- Catalogues et contenus téléchargés
- Paramètres de sauvegarde/restauration

## 📋 Comment utiliser

### ✅ Sauvegarder des données ESSENTIELLES

```typescript
// Toujours autorisé (même utilisateurs gratuits)
await LocalStorageManager.saveEssential("LOCATION_MODE", "auto");
await LocalStorageManager.saveEssential("CURRENT_LANGUAGE", "fr");
await LocalStorageManager.saveEssential("LOCAL_FAVORITES", favoritesList);
```

### 🔐 Sauvegarder des données UTILISATEUR

```typescript
// Seulement si connexion explicite
const isExplicit = await LocalStorageManager.checkExplicitConnection();
await LocalStorageManager.saveUser("USER_FIRST_NAME", firstName, isExplicit);
```

### 💎 Sauvegarder des données PREMIUM

```typescript
// Seulement si premium + connexion explicite
const isExplicit = await LocalStorageManager.checkExplicitConnection();
const isPremium = user.isPremium;
await LocalStorageManager.savePremium(
  "PREMIUM_CATALOG_CACHE",
  data,
  isPremium,
  isExplicit
);
```

### 📖 Lire des données

```typescript
// Lecture (toujours possible)
const locationMode = await LocalStorageManager.getEssential("LOCATION_MODE");
const userData = await LocalStorageManager.getUser("USER_DATA");
const premiumData = await LocalStorageManager.getPremium("PREMIUM_USER");
```

## 🛠️ Mise à jour des contextes existants

### Avant (problématique)

```typescript
const setUserFirstName = (firstName) => {
  setUserFirstName(firstName);
  AsyncStorage.setItem("userFirstName", firstName); // ❌ Toujours sauvegardé
};
```

### Après (stratifié)

```typescript
const setUserFirstName = async (firstName) => {
  setUserFirstName(firstName);
  // ✅ Seulement si connexion explicite
  const isExplicit = await LocalStorageManager.checkExplicitConnection();
  await LocalStorageManager.saveUser("USER_FIRST_NAME", firstName, isExplicit);
};
```

## 🔧 Utilitaires disponibles

### 🧹 Nettoyage sélectif

```typescript
// Nettoyer seulement les données utilisateur
await LocalStorageManager.clearUserData();

// Nettoyer seulement les données premium
await LocalStorageManager.clearPremiumData();

// Nettoyer TOUT (dangereux)
await LocalStorageManager.clearAllData();
```

### 🔍 Vérifications

```typescript
// Vérifier si connexion explicite
const isExplicit = await LocalStorageManager.checkExplicitConnection();

// Activer/désactiver connexion explicite
await LocalStorageManager.setExplicitConnection(true);
```

## 📝 Liste des clés disponibles

### 🟢 ESSENTIAL_STORAGE_KEYS

- `LOCATION_MODE`, `MANUAL_LOCATION`, `AUTO_LOCATION`
- `CURRENT_LANGUAGE`, `THEME_MODE`, `IS_FIRST_TIME`
- `CALC_METHOD`, `ADHAN_SOUND`, `ADHAN_VOLUME`
- `NOTIFICATIONS_ENABLED`, `REMINDERS_ENABLED`
- `ENABLED_AFTER_SALAH`, `ENABLED_MORNING_DHIKR`, etc.
- `AUDIO_QUALITY`, `DOWNLOAD_STRATEGY`
- `LOCAL_FAVORITES`

### 🟡 USER_STORAGE_KEYS

- `USER_DATA`, `USER_FIRST_NAME`
- `EXPLICIT_CONNECTION`, `CUSTOM_SETTINGS`
- `USER_SETTINGS`

### 🔴 PREMIUM_STORAGE_KEYS

- `PREMIUM_USER`, `PREMIUM_CATALOG_CACHE`
- `DOWNLOADED_CONTENT`, `AUDIO_SETTINGS`
- `BACKUP_SETTINGS`, `LAST_BACKUP_TIME`
- `CLOUD_SYNC_TIME`, `CLOUD_SYNC_ENABLED`

## 🎯 Résultat attendu

### 👤 Utilisateurs gratuits

- ✅ Peuvent sauvegarder leurs préférences essentielles
- ✅ App fonctionne normalement
- ❌ Pas de données utilisateur automatiques

### 💎 Utilisateurs premium (non connectés)

- ✅ Mêmes avantages que gratuits
- ❌ Pas de synchronisation cloud
- ❌ Pas de données premium

### 💎 Utilisateurs premium (connectés explicitement)

- ✅ Toutes les fonctionnalités
- ✅ Synchronisation cloud
- ✅ Sauvegarde/restauration

## 🔄 Migration depuis l'ancien système

Pour migrer un contexte existant :

1. Ajouter l'import : `import { LocalStorageManager } from "../utils/localStorageManager";`
2. Remplacer `AsyncStorage.setItem()` par `LocalStorageManager.saveEssential/saveUser/savePremium()`
3. Remplacer `AsyncStorage.getItem()` par `LocalStorageManager.getEssential/getUser/getPremium()`
4. Rendre les fonctions `async` si nécessaire
5. Ajouter la vérification de connexion explicite pour les données utilisateur/premium

Ce système respecte le **mode professionnel** tout en permettant aux utilisateurs gratuits d'avoir une expérience complète ! 🎉
