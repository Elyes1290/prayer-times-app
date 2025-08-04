# 🔐 Guide d'utilisation des APIs d'authentification

## 📋 **Vue d'ensemble**

Les APIs d'authentification ont été adaptées pour supporter la nouvelle structure de données simplifiée avec gestion des mots de passe.

## 🚀 **Nouvelles fonctionnalités**

### **1. Structure utilisateur simplifiée**

- ✅ **Gardé** : `user_first_name` (prénom ou pseudo)
- ✅ **Gardé** : `password_hash` (mot de passe hashé)
- ✅ **Gardé** : `email_verified` (optionnel)
- ❌ **Supprimé** : `user_last_name`, `phone_number`, `date_of_birth`, `gender`, `profile_picture`, `phone_verified`

### **2. Gestion des mots de passe**

- 🔐 **Inscription avec mot de passe** : Obligatoire si email fourni
- 🔐 **Connexion avec mot de passe** : Vérification si mot de passe configuré
- 🔐 **Ajout de mot de passe** : Pour comptes existants sans mot de passe

## 📡 **Endpoints disponibles**

### **POST /api/auth.php - Connexion**

```json
{
  "action": "login",
  "device_id": "device_123",
  "email": "user@example.com",
  "password": "password123"
}
```

**Réponses possibles :**

- ✅ **200** : Connexion réussie
- ❌ **400** : Mot de passe requis
- ❌ **401** : Mot de passe incorrect ou compte sans mot de passe
- ❌ **404** : Utilisateur non trouvé (suggère l'inscription)

### **POST /api/auth.php - Inscription**

```json
{
  "action": "register",
  "device_id": "device_123",
  "email": "user@example.com",
  "password": "password123",
  "user_first_name": "John",
  "language": "fr"
}
```

**Règles de validation :**

- ✅ `device_id` : **Obligatoire**
- ✅ `email` + `password` : **Obligatoires ensemble**
- ✅ `password` : **Minimum 6 caractères**
- ✅ `user_first_name` : **Optionnel**

### **POST /api/auth.php - Ajouter un mot de passe**

```json
{
  "action": "add_password",
  "device_id": "device_123",
  "email": "user@example.com",
  "password": "newpassword123"
}
```

**Cas d'usage :**

- 🔄 Compte existant sans mot de passe
- 🔄 Ajout de sécurité à un compte device_id

## 🔄 **Workflows d'authentification**

### **1. Inscription simple (device_id uniquement)**

```json
{
  "action": "register",
  "device_id": "device_123",
  "user_first_name": "John"
}
```

### **2. Inscription complète (email + mot de passe)**

```json
{
  "action": "register",
  "device_id": "device_123",
  "email": "user@example.com",
  "password": "password123",
  "user_first_name": "John"
}
```

### **3. Connexion par device_id (comptes sans email)**

```json
{
  "action": "login",
  "device_id": "device_123"
}
```

### **4. Connexion par email + mot de passe (obligatoire)**

```json
{
  "action": "login",
  "device_id": "device_123",
  "email": "user@example.com",
  "password": "password123"
}
```

## 📊 **Réponses API**

### **Connexion réussie**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "user_first_name": "John",
      "device_id": "device_123",
      "premium_status": 1,
      "is_premium": true,
      "premium_active": true,
      "has_password": true
    },
    "auth_token": "token_123",
    "login_method": "email",
    "has_password": true
  },
  "message": "Connexion réussie"
}
```

### **Inscription réussie**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "user_first_name": "John",
      "device_id": "device_123",
      "premium_status": 0,
      "is_premium": false,
      "premium_active": false,
      "has_password": true
    },
    "auth_token": "token_123",
    "registration_method": "email",
    "has_password": true
  },
  "message": "Inscription réussie"
}
```

## 🛡️ **Sécurité**

### **Mots de passe**

- 🔐 **Hashage** : bcrypt avec `PASSWORD_DEFAULT`
- 🔐 **Validation** : Minimum 6 caractères
- 🔐 **Vérification** : `password_verify()` pour la connexion

### **Champs sensibles exclus**

- ❌ `password_hash`
- ❌ `verification_token`
- ❌ `reset_password_token`
- ❌ `login_attempts`
- ❌ `account_locked`

## 🔧 **Migration depuis l'ancienne structure**

### **Script SQL de migration**

```sql
-- Exécuter scripts/update-users-table-simplified.sql
ALTER TABLE `users`
DROP COLUMN IF EXISTS `user_last_name`,
DROP COLUMN IF EXISTS `phone_number`,
DROP COLUMN IF EXISTS `date_of_birth`,
DROP COLUMN IF EXISTS `gender`,
DROP COLUMN IF EXISTS `profile_picture`,
DROP COLUMN IF EXISTS `phone_verified`;
```

## 📝 **Logs et monitoring**

### **Actions loggées**

- 🔍 `user_login` : Connexion utilisateur
- 🔍 `user_registered` : Inscription utilisateur
- 🔍 `password_added` : Ajout de mot de passe

### **Données de debug**

- 📍 Données de localisation
- 📊 Données premium
- 🔐 Données d'inscription (email, mot de passe, nom)

## 🚨 **Gestion d'erreurs**

### **Codes d'erreur courants**

- **400** : Données manquantes ou invalides
- **401** : Mot de passe incorrect
- **404** : Utilisateur non trouvé
- **409** : Conflit (compte existant, mot de passe déjà configuré)
- **500** : Erreur serveur

### **Messages d'erreur explicites**

- "Mot de passe requis pour l'inscription avec email"
- "Le mot de passe doit contenir au moins 6 caractères"
- "Ce compte n'a pas de mot de passe configuré"
- "Ce compte a déjà un mot de passe configuré"
