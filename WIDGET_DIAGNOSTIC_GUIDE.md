# 🔍 Guide de Diagnostic du Widget Quran

## Problème identifié

Le bouton "suivant" du widget de lecture audio du Coran ne fonctionne pas correctement.

## Système de diagnostic mis en place

### 1. **Logs de diagnostic détaillés**

J'ai ajouté des logs complets dans :

- `QuranWidget.java` : Méthode `handleNext()` avec diagnostic complet
- `QuranAudioService.java` : Méthode `handleNext()` avec diagnostic complet
- `QuranAudioService.java` : BroadcastReceiver avec logs d'arrivée des actions

### 2. **Méthode de diagnostic automatique**

- Méthode `runDiagnostic()` dans `QuranWidget.java`
- Accessible depuis React Native via `useQuranWidget().runWidgetDiagnostic()`
- Bouton de diagnostic temporaire dans l'écran Quran (mode développement)

### 3. **Points de blocage identifiés**

#### **BLOCAGE 1 : Statut Premium**

- Vérification : `isPremiumUser` doit être `true`
- Log : `"⚠️ handleNext() - Utilisateur non premium - BLOCAGE 1"`

#### **BLOCAGE 2 : Audio Local**

- Vérification : `isCurrentAudioLocal()` doit retourner `true`
- Log : `"⚠️ handleNext() - Audio actuel non local, navigation ignorée - BLOCAGE 2"`

#### **BLOCAGE 3 : Sourates Téléchargées**

- Vérification : `getDownloadedSurahs()` ne doit pas être vide
- Log : `"⚠️ Aucune sourate téléchargée pour la navigation - BLOCAGE 3"`

#### **BLOCAGE 4 : Sourate Suivante**

- Vérification : Une sourate suivante doit être trouvée
- Log : `"⏹️ Pas de sourate suivante téléchargée - BLOCAGE 4"`

## Instructions de diagnostic

### Étape 1 : Lancer le diagnostic

1. Ouvrir l'application en mode développement
2. Aller dans l'écran Quran
3. Cliquer sur le bouton "🔍 Diagnostic Widget" (visible seulement en mode dev)
4. Vérifier les logs dans Android Studio ou `adb logcat`

### Étape 2 : Analyser les logs

Chercher dans les logs les messages suivants :

```
🔍 DIAGNOSTIC COMPLET DU SYSTÈME WIDGET QURAN
🔍 1. Statut premium: true/false
🔍 2. État actuel: currentSurah, currentReciter, etc.
🔍 3. Service en cours d'exécution: true/false
🔍 4. Dossier Quran: /data/data/.../files/quran
🔍 5. Audio local actuel: true/false
🔍 6. Test envoi action...
```

### Étape 3 : Identifier le blocage

Selon les logs, identifier quel blocage se produit :

1. **BLOCAGE 1** → Problème de synchronisation du statut premium
2. **BLOCAGE 2** → Audio actuel en streaming (pas local)
3. **BLOCAGE 3** → Aucune sourate téléchargée
4. **BLOCAGE 4** → Pas de sourate suivante disponible

## Solutions par blocage

### BLOCAGE 1 : Statut Premium

```java
// Vérifier la synchronisation
SharedPreferences prefs = context.getSharedPreferences("premium_prefs", Context.MODE_PRIVATE);
boolean isPremium = prefs.getBoolean("is_premium_user", false);
```

**Solution** : Forcer la synchronisation du statut premium depuis React Native

### BLOCAGE 2 : Audio Non Local

```java
// Vérifier si l'audio est local
boolean isAudioLocal = isCurrentAudioLocal(context);
```

**Solution** : S'assurer qu'une sourate locale est chargée avant de tester la navigation

### BLOCAGE 3 : Aucune Sourate Téléchargée

```java
// Vérifier les sourates téléchargées
List<Integer> downloadedSurahs = getDownloadedSurahs(currentReciter);
```

**Solution** : Télécharger au moins une sourate pour le récitateur actuel

### BLOCAGE 4 : Pas de Sourate Suivante

```java
// Vérifier la navigation
int nextSurahNumber = findNextSurah(downloadedSurahs, currentSurahNumber);
```

**Solution** : Télécharger plus de sourates ou activer la boucle

## Test manuel

### Test 1 : Vérifier le service

```bash
adb logcat | grep "QuranAudioService"
```

### Test 2 : Vérifier le widget

```bash
adb logcat | grep "QuranWidget"
```

### Test 3 : Vérifier les actions

```bash
adb logcat | grep "ACTION_NEXT"
```

## Prochaines étapes

1. **Lancer le diagnostic** et identifier le blocage exact
2. **Appliquer la solution** correspondante au blocage
3. **Tester la navigation** après correction
4. **Vérifier les logs** pour confirmer le bon fonctionnement

## Fichiers modifiés

- `android/app/src/main/java/com/drogbinho/prayertimesapp2/QuranWidget.java`
- `android/app/src/main/java/com/drogbinho/prayertimesapp2/QuranAudioService.java`
- `android/app/src/main/java/com/drogbinho/prayertimesapp2/QuranWidgetModule.java`
- `hooks/useQuranWidget.ts`
- `screens/QuranScreen.tsx`

## Notes importantes

- Le diagnostic est temporaire et sera retiré après résolution
- Les logs détaillés aident à identifier précisément le problème
- Le système de blocage empêche les actions invalides
- La navigation ne fonctionne qu'avec des sourates téléchargées localement
