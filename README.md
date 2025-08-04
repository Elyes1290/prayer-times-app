# 🕌 Prayer Times App - Version MySQL

> **Application mobile React Native pour les horaires de prière avec backend MySQL sécurisé**

## 🚀 **Migration Firebase → MySQL Terminée !**

Cette application a été **entièrement migrée** de Firebase vers une infrastructure MySQL, permettant des **économies de 1615 CHF/an** et un contrôle total des données.

## 📊 **État Actuel (Post-Migration)**

### **✅ Fonctionnalités Opérationnelles :**

- **Utilisateurs** : Création, authentification, profils complets
- **Horaires de prière** : Calcul automatique et personnalisé
- **Favoris** : Sauvegarde Coran, Hadith, Dhikr
- **Récitations** : Streaming et téléchargement optimisé
- **Notifications** : Widget Android + rappels
- **Multilingual** : 13 langues supportées
- **Premium** : Système d'abonnements intégré

### **🔐 Sécurité Renforcée :**

- **Variables d'environnement** pour tous les secrets
- **Validation d'entrée** et protection SQL injection
- **Tokens JWT** pour l'authentification
- **Audit de sécurité** complet effectué

## 🏗️ **Architecture Technique**

```
prayer-times-app/
├── 📱 Frontend (React Native/Expo)
│   ├── app/              # Écrans principaux
│   ├── components/       # Composants réutilisables
│   ├── contexts/         # États globaux (FavoritesContext, etc.)
│   └── utils/           # API clients et utilitaires
├── 🗄️ Backend (MySQL/PHP)
│   ├── api/             # APIs REST sécurisées
│   ├── scripts/         # Migration et utilitaires
│   └── assets/          # Ressources (audio, données)
└── 🤖 Android Native
    └── app/src/main/java/ # Widget et notifications
```

## 🚀 **Installation et Configuration**

### **1. Prérequis**

```bash
# Node.js et npm
node --version  # v18+
npm --version   # v9+

# Expo CLI
npm install -g @expo/cli

# Android Studio (pour le développement Android)
# Xcode (pour le développement iOS)
```

### **2. Installation des Dépendances**

```bash
# Cloner le repository
git clone https://github.com/your-repo/prayer-times-app.git
cd prayer-times-app

# Installer les dépendances
npm install
```

### **3. Configuration Sécurisée**

```bash
# Copier le fichier d'environnement
cp env.example .env

# Configurer vos variables (obligatoire)
nano .env
```

**Variables critiques à configurer :**

```env
DB_HOST=your_mysql_host
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASS=your_secure_password
HADITH_API_KEY=your_hadith_api_key
```

### **4. Base de Données**

```bash
# Créer les tables MySQL
mysql -u your_user -p your_database < scripts/create-prayer-database-final.sql

# Ou utiliser phpMyAdmin avec le script SQL
```

### **5. Lancement**

```bash
# Développement
npm start

# Android
npm run android

# iOS
npm run ios

# Web
npm run web
```

## 📋 **APIs Disponibles**

### **Base URL :** `https://elyesnaitliman.ch/api`

| Endpoint           | Méthode         | Description          |
| ------------------ | --------------- | -------------------- |
| `/users.php`       | GET/POST        | Gestion utilisateurs |
| `/auth.php`        | POST            | Authentification     |
| `/favorites.php`   | GET/POST/DELETE | Gestion favoris      |
| `/recitations.php` | GET/POST        | Récitations premium  |
| `/test-api.php`    | GET             | Tests de santé       |

### **Exemple d'utilisation :**

```javascript
// Créer un utilisateur
const response = await fetch("https://elyesnaitliman.ch/api/users.php", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    device_id: "unique_device_id",
    language: "fr",
    user_first_name: "Utilisateur",
  }),
});
```

## 🧪 **Tests et Qualité**

### **Tests Automatisés :**

```bash
# Lancer tous les tests
node test-app-complete.js

# Tests spécifiques
npm run test
npm run lint
```

**Taux de réussite actuel :** **71%** (5/7 tests réussis)

### **Couverture des Tests :**

- ✅ Connectivité API
- ✅ Gestion utilisateurs
- ✅ Authentification
- ✅ Récitations
- ⚠️ Favoris (variables de config)
- ⚠️ Backups (logique doublons)

## 💰 **Économies Réalisées**

| Métrique            | Avant (Firebase) | Après (MySQL)   | Économie |
| ------------------- | ---------------- | --------------- | -------- |
| **Coût mensuel**    | 173 CHF          | 38 CHF          | **-78%** |
| **Coût annuel**     | 2076 CHF         | 461 CHF         | **-78%** |
| **Économie totale** | -                | **1615 CHF/an** | 🎯       |

## 🌍 **Internationalisation**

**13 langues supportées :**

- Français (fr) 🇫🇷
- Anglais (en) 🇺🇸
- Arabe (ar) 🇸🇦
- Bengali (bn) 🇧🇩
- Allemand (de) 🇩🇪
- Espagnol (es) 🇪🇸
- Persan (fa) 🇮🇷
- Italien (it) 🇮🇹
- Néerlandais (nl) 🇳🇱
- Portugais (pt) 🇵🇹
- Russe (ru) 🇷🇺
- Turc (tr) 🇹🇷
- Ourdou (ur) 🇵🇰

## 🔧 **Scripts Utilitaires**

```bash
# Optimisation audio
./compress-audio.ps1

# Migration base de données
./migrate-database-complete.ps1

# Tests de sécurité
node scripts/validate-security.js

# Analyse des coûts
node scripts/cost-calculator.js
```

## 📱 **Fonctionnalités Premium**

- **Récitations HD** : Qualité studio
- **Adhans personnalisés** : 8+ récitateurs
- **Synchronisation cloud** : Backup automatique
- **Analytics avancées** : Statistiques détaillées
- **Support prioritaire** : Assistance dédiée

## 🐛 **Dépannage**

### **Problèmes Courants :**

1. **Erreur base de données :**

   ```bash
   # Vérifier la configuration
   php api/test-database-connection.php
   ```

2. **Widget Android non mis à jour :**

   ```bash
   # Redémarrer le service
   adb shell am broadcast -a android.appwidget.action.APPWIDGET_UPDATE
   ```

3. **API non accessible :**
   ```bash
   # Tester la connectivité
   curl https://elyesnaitliman.ch/api/test-api.php
   ```

## 🤝 **Contribution**

1. **Fork** le projet
2. **Créer** une branche (`git checkout -b feature/AmazingFeature`)
3. **Commiter** les changements (`git commit -m 'Add AmazingFeature'`)
4. **Push** vers la branche (`git push origin feature/AmazingFeature`)
5. **Ouvrir** une Pull Request

## 📄 **Licence**

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 📞 **Support**

- **Documentation :** [Guide API](./API_INTEGRATION_GUIDE.md)
- **Sécurité :** [Guide Sécurité](./SECURITY.md)
- **Tests :** [Rapport automatisé](./test-report-latest.json)
- **Issues :** [GitHub Issues](https://github.com/your-repo/prayer-times-app/issues)

---

## 🎯 **Roadmap 2024**

- [x] **Migration Firebase → MySQL** (Terminé)
- [x] **Optimisation coûts** (1615 CHF économisés)
- [x] **Sécurisation APIs** (Variables d'environnement)
- [ ] **Amélioration Widget Android** (version 2.0)
- [ ] **Version iOS** (Q2 2024)
- [ ] **Dashboard admin** (Q3 2024)

---

**⭐ Si cette application vous aide, n'hésitez pas à lui donner une étoile !**

_Application développée avec ❤️ pour la communauté musulmane_
