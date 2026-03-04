# 🔐 AUDIT COMPLET - DÉCONNEXIONS VIP

## 🚨 PROBLÈME IDENTIFIÉ

Les utilisateurs VIP (statut VIP à vie) se faisaient déconnecter automatiquement sans raison.

---

## 📋 CAUSES IDENTIFIÉES ET CORRIGÉES

### ❌ **CAUSE #1** : Vérification `explicit_connection` toutes les 5 minutes
**Fichier** : `contexts/PremiumContext.tsx` (lignes 457-501)

**Problème** :
- Un `useEffect` vérifie toutes les 5 minutes si `explicit_connection = "true"` existe
- Si cette clé n'existe pas → déconnexion automatique
- **Aucune protection VIP** → même les VIP se faisaient déconnecter

**Solution appliquée** :
✅ Ajout de la vérification VIP AVANT toute déconnexion :
```typescript
// Vérifier d'abord si l'utilisateur est VIP
const parsedUser = safeJsonParse<any>(storedUser, null);
if (parsedUser?.isVip) {
  console.log("👑 [VIP PROTECTION] Utilisateur VIP - pas de déconnexion");
  return; // NE JAMAIS déconnecter les VIP
}
```

---

### ❌ **CAUSE #2** : Nettoyage des données incohérentes au démarrage
**Fichier** : `app/_layout.tsx` (lignes 452-464)

**Problème** :
- Si `explicit_connection = "true"` mais `user_data` manquant
- Suppression automatique de `explicit_connection`
- **Pas de protection VIP**

**Solution appliquée** :
✅ Vérification VIP avant nettoyage :
```typescript
if (isVip) {
  console.log("👑 [VIP PROTECTION] Utilisateur VIP - pas de nettoyage");
} else {
  await AsyncStorage.multiRemove([...]);
}
```

---

### ❌ **CAUSE #3** : Token invalide détecté
**Fichier** : `app/_layout.tsx` (lignes 523-550)

**Problème** :
- Si `verifyAuth()` retourne `false` (token expiré/invalide)
- Déconnexion automatique + suppression de toutes les données
- **Pas de protection VIP**

**Solution appliquée** :
✅ Protection VIP avant déconnexion :
```typescript
if (isVip) {
  console.log("👑 [VIP PROTECTION] Token invalide mais VIP - pas de déconnexion");
  console.log("⚠️ L'utilisateur VIP devra se reconnecter manuellement si nécessaire");
} else {
  // Déconnecter les utilisateurs non-VIP
}
```

---

### ❌ **CAUSE #4** : Nettoyage des tokens orphelins
**Fichier** : `app/_layout.tsx` (lignes 555-566)

**Problème** :
- Si token existe mais `explicit_connection !== "true"`
- Suppression automatique de toutes les données
- **Pas de protection VIP**

**Solution appliquée** :
✅ Restauration automatique de `explicit_connection` pour les VIP :
```typescript
if (isVip) {
  console.log("👑 [VIP PROTECTION] Token orphelin mais VIP - restauration");
  await AsyncStorage.setItem("explicit_connection", "true");
} else {
  await AsyncStorage.multiRemove([...]);
}
```

---

## 🎯 COMMENT ÇA FONCTIONNE MAINTENANT ?

### Pour les utilisateurs VIP :
1. ✅ **Jamais déconnectés automatiquement** (même si `explicit_connection` manque)
2. ✅ **Protection contre token invalide** (pas de déconnexion forcée)
3. ✅ **Restauration automatique** de `explicit_connection` si perdu
4. ✅ **Vérification d'expiration désactivée** (ligne 136-139 de PremiumContext)

### Pour les utilisateurs premium payants :
1. ✅ Vérification d'expiration normale
2. ✅ Synchronisation avec Stripe pour renouvellements automatiques
3. ✅ Déconnexion si token invalide (sécurité)

---

## 🔍 IDENTIFICATION VIP

Le système vérifie si un utilisateur est VIP via **3 sources** :

### 1. `@prayer_app_premium_user` (AsyncStorage)
```typescript
const parsed = JSON.parse(premiumUser);
isVip = parsed?.isVip === true;
```

### 2. `user_data` (AsyncStorage)
```typescript
const parsed = JSON.parse(userData);
isVip = parsed?.is_vip === true || parsed?.subscription_platform === 'vip';
```

### 3. Base de données MySQL
```sql
SELECT is_vip FROM users WHERE email = ?
-- is_vip = TRUE (1) = VIP à vie
```

---

## 📝 LOGS À SURVEILLER

Pour détecter les problèmes de déconnexion VIP, cherchez ces logs :

### ✅ Logs normaux (VIP protégé) :
```
👑 [VIP PROTECTION] Utilisateur VIP détecté - pas de déconnexion automatique
👑 [VIP PROTECTION] Token invalide mais utilisateur VIP - pas de déconnexion automatique
👑 [VIP PROTECTION] Token orphelin mais utilisateur VIP - restauration de explicit_connection
```

### ❌ Logs problématiques (si VIP déconnecté) :
```
🧹 Nettoyage des données incohérentes
🧹 Nettoyage - explicit_connection=true mais pas de user_data
❌ Token invalide détecté, déconnexion...
🧹 Nettoyage des tokens orphelins
```

Si ces logs ❌ apparaissent pour un VIP, **c'est un bug** !

---

## 🧪 TEST DE VALIDATION

### Scénario 1 : VIP avec `explicit_connection` manquant
1. Supprimer `explicit_connection` d'un compte VIP
2. Attendre 5 minutes
3. ✅ **Résultat attendu** : VIP reste connecté, log "👑 VIP PROTECTION"

### Scénario 2 : VIP avec token invalide
1. Corrompre le token d'un compte VIP
2. Redémarrer l'app
3. ✅ **Résultat attendu** : VIP reste connecté, log "👑 VIP PROTECTION"

### Scénario 3 : Premium payant expiré
1. Définir `premium_expiry` à une date passée
2. Attendre la vérification périodique (1h)
3. ✅ **Résultat attendu** : Déconnexion + message "Abonnement expiré"

### Scénario 4 : Premium payant expiré MAIS VIP
1. Compte avec `is_vip = TRUE`
2. Vérification d'expiration lancée
3. ✅ **Résultat attendu** : Pas de déconnexion, log "👑 Utilisateur VIP - pas de vérification d'expiration"

---

## 🎯 GESTION DES COMPTES VIP

### Créer un nouveau compte VIP :
```bash
php scripts/manage-vip.php create email@example.com Prénom "Raison VIP"
```

### Accorder VIP à un utilisateur existant :
```bash
php scripts/manage-vip.php grant email@example.com "Raison VIP"
```

### Lister tous les VIP :
```bash
php scripts/manage-vip.php list
```

### Vérifier un utilisateur :
```bash
php scripts/manage-vip.php check email@example.com
```

---

## ✅ RÉSULTAT

**AVANT** : Les utilisateurs VIP se faisaient déconnecter toutes les 5 minutes ou au démarrage de l'app

**APRÈS** : Les utilisateurs VIP sont **protégés contre toute déconnexion automatique**

---

## 📌 FICHIERS MODIFIÉS

1. ✅ `contexts/PremiumContext.tsx` (lignes 457-501)
2. ✅ `app/_layout.tsx` (lignes 452-464)
3. ✅ `app/_layout.tsx` (lignes 492-520)
4. ✅ `app/_layout.tsx` (lignes 523-550)
5. ✅ `app/_layout.tsx` (lignes 555-566)

---

## 🚀 PROCHAINES ÉTAPES

1. ✅ Tester les corrections avec un compte VIP réel
2. ✅ Surveiller les logs pendant 24h-48h
3. ✅ Vérifier qu'aucun VIP ne se déconnecte plus
4. ✅ Si tout fonctionne, commit des changements

---

**Date de l'audit** : 2026-01-24  
**Statut** : ✅ Corrections appliquées - En attente de tests
