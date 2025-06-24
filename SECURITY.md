# 🔐 Guide de Sécurité - MyAdhan Prayer App

## Configuration des Variables Sensibles

Cette application utilise des variables d'environnement pour protéger les informations sensibles comme les clés API et mots de passe.

### 📱 API Keys

#### Clé API Hadith

- **Fichier de config** : `app.config.js`
- **Variable** : `hadithApiKey`
- **Usage** : Accès à l'API des hadiths

Pour modifier la clé :

1. Éditez `app.config.js`
2. Changez la valeur dans `extra.hadithApiKey`
3. Ou définissez la variable d'environnement `HADITH_API_KEY`

### 🔑 Signature Android

#### Configuration

- **Fichier** : `android/gradle.properties` (ignoré par Git)
- **Variables** :
  - `MYAPP_RELEASE_STORE_PASSWORD`
  - `MYAPP_RELEASE_KEY_PASSWORD`

#### Setup initial

1. Copiez `android/gradle.properties.example` vers `android/gradle.properties`
2. Remplacez les mots de passe par vos vraies valeurs
3. Ne commitez JAMAIS le fichier `gradle.properties` avec les vraies valeurs

### 📋 Checklist de Sécurité

✅ **Fait :**

- [x] API keys déplacées dans la configuration
- [x] Mots de passe Android externalisés
- [x] Fichiers sensibles ajoutés au .gitignore
- [x] Template de configuration créé

🔄 **À faire (optionnel pour plus de sécurité) :**

- [ ] Utiliser un service de gestion de secrets (HashiCorp Vault, AWS Secrets Manager)
- [ ] Chiffrer les clés API
- [ ] Rotation automatique des clés
- [ ] Audit de sécurité externe

### ⚠️ Importantes Notes

1. **Ne jamais commiter** les fichiers contenant des vraies clés
2. **Changer les mots de passe** par défaut en production
3. **Utiliser des mots de passe forts** (minimum 16 caractères)
4. **Limiter l'accès** aux fichiers de configuration

### 🛠️ Pour les Développeurs

Si vous clonez ce projet :

1. Copiez `android/gradle.properties.example` vers `android/gradle.properties`
2. Demandez les vraies valeurs à l'administrateur du projet
3. Ne partagez JAMAIS vos clés via des canaux non sécurisés

---

**En cas de compromission d'une clé, changez-la immédiatement !**
