# 🔐 GUIDE DE SÉCURITÉ - Prayer Times App

## ⚠️ IMPORTANT : Protection des Secrets

Ce guide explique comment protéger vos clés API, mots de passe et autres informations sensibles.

## 📁 Fichiers Sensibles à Protéger

### 🔑 Clés API et Tokens

- `google-services.json` - Configuration Firebase Android
- `GoogleService-Info.plist` - Configuration Firebase iOS
- `utils/hadithApi.ts` - Clé API Hadith
- `api/config.php` - Secrets de base de données et API

### 🗄️ Configuration Base de Données

- `api/config.php` - Identifiants MySQL
- Variables d'environnement `.env`

### 🔐 Fichiers de Signature

- `*.keystore` - Clés de signature Android
- `*.jks` - Java KeyStore
- `*.p8` - Certificats iOS
- `*.p12` - Certificats de distribution

## 🛡️ Protection Automatique

Le fichier `.gitignore` est configuré pour ignorer automatiquement :

```bash
# Fichiers de configuration sensibles
google-services.json
GoogleService-Info.plist
.env*
*.env

# Clés et certificats
*.keystore
*.jks
*.p8
*.p12
*.key
*.pem

# Configuration Android
android/gradle.properties
android/app/google-services.json

# Configuration iOS
ios/GoogleService-Info.plist
```

## 🔧 Configuration Sécurisée

### 1. Variables d'Environnement

```bash
# Copiez le fichier d'exemple
cp env.example .env

# Remplissez avec vos vraies valeurs
nano .env
```

### 2. Configuration Base de Données (CRITIQUE)

```bash
# Créez un fichier .env avec vos identifiants
echo "DB_HOST=your_host" > .env
echo "DB_NAME=your_database" >> .env
echo "DB_USER=your_user" >> .env
echo "DB_PASS=your_password" >> .env
```

### 3. Configuration API PHP

```php
// api/config.php utilise maintenant les variables d'environnement
define('DB_HOST', $_ENV['DB_HOST'] ?? 'localhost');
define('DB_NAME', $_ENV['DB_NAME'] ?? 'your_database_name');
define('DB_USER', $_ENV['DB_USER'] ?? 'your_database_user');
define('DB_PASS', $_ENV['DB_PASS'] ?? 'your_database_password');
```

### 4. Clés API Externes

```typescript
// utils/hadithApi.ts
const API_KEY = Constants.expoConfig?.extra?.hadithApiKey || "demo-key";
```

## 🚨 Vérifications de Sécurité

### Avant chaque commit :

```bash
# Vérifiez qu'aucun secret n'est exposé
git diff --cached | grep -i "password\|secret\|key\|token"

# Vérifiez les fichiers sensibles
git status --ignored
```

### Script de vérification automatique :

```bash
#!/bin/bash
# security-check.sh
echo "🔍 Vérification de sécurité..."

# Vérifier les fichiers sensibles
SENSITIVE_FILES=(
  "google-services.json"
  "GoogleService-Info.plist"
  ".env"
  "*.keystore"
  "*.jks"
)

for file in "${SENSITIVE_FILES[@]}"; do
  if git ls-files | grep -q "$file"; then
    echo "❌ ATTENTION: $file est dans le repository!"
    exit 1
  fi
done

echo "✅ Aucun fichier sensible détecté"
```

## 🔄 Gestion des Secrets en Production

### 1. Variables d'Environnement

```bash
# Sur votre serveur
export DB_PASSWORD="your_secure_password"
export API_SECRET_KEY="your_secure_api_key"
```

### 2. Configuration EAS Build

```bash
# eas.json
{
  "build": {
    "production": {
      "env": {
        "API_SECRET_KEY": "your_production_key"
      }
    }
  }
}
```

### 3. Secrets dans les Stores

- **Google Play Console** : Variables d'environnement
- **App Store Connect** : Configuration de build
- **Firebase Console** : Variables d'environnement

## 🆘 En Cas de Compromission

### 1. Révoquer immédiatement

- Clés API exposées
- Tokens d'accès
- Certificats de signature

### 2. Régénérer

- Nouvelles clés API
- Nouveaux certificats
- Nouveaux tokens

### 3. Mettre à jour

- Variables d'environnement
- Configuration de build
- Documentation

## 📋 Checklist de Sécurité

- [ ] Aucun fichier `.env` dans le repository
- [ ] `google-services.json` dans `.gitignore`
- [ ] Clés API dans les variables d'environnement
- [ ] Certificats de signature sécurisés
- [ ] Mots de passe de base de données protégés
- [ ] Scripts de vérification automatisés
- [ ] Documentation à jour

## 🔗 Ressources Utiles

- [GitHub Security Best Practices](https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure)
- [Firebase Security Rules](https://firebase.google.com/docs/rules)
- [React Native Security](https://reactnative.dev/docs/security)
- [Expo Security](https://docs.expo.dev/guides/security/)

---

**⚠️ RÈGLE D'OR : Ne jamais commiter de secrets dans Git !**
