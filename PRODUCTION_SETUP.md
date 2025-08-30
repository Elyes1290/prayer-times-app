# 🚀 GUIDE DE CONFIGURATION PRODUCTION - MyAdhan Prayer App

## ✅ MODIFICATIONS EFFECTUÉES

### 1. **Configuration Stripe Production Activée**

- ✅ **api/stripe.php** : Price IDs de production activés

  - Premium Mensuel : `price_1RsTUJDYlp8PcvcNUQz2zTro`
  - Premium Annuel : `price_1RsTV3DYlp8PcvcNlOaFW2CW`
  - Premium Familial : `price_1RsTVXDYlp8PcvcNERdlWk9n`

- ✅ **utils/stripeConfig.ts** : Clés de test retirées (sécurité renforcée)

- ✅ **api/test-secure-payment.php** : Désactivé automatiquement en production

---

## ⚠️ ÉTAPES CRITIQUES À COMPLÉTER

### **1. Variables d'environnement production (.env)**

Créer un fichier `.env` sur votre serveur avec :

```bash
# 🔐 BASE DE DONNÉES
DB_HOST=your_production_db_host
DB_NAME=your_production_db_name
DB_USER=your_production_db_user
DB_PASSWORD=your_secure_production_password

# 💳 STRIPE PRODUCTION
STRIPE_SECRET_KEY=sk_live_YOUR_REAL_SECRET_KEY
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_REAL_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_REAL_WEBHOOK_SECRET

# 🔐 SÉCURITÉ
API_SECRET_KEY=your_secure_32_character_api_key
JWT_SECRET=your_secure_jwt_secret_key
BCRYPT_ROUNDS=12

# 📊 PRODUCTION MODE
NODE_ENV=production
ENABLE_DEBUG_LOGS=false
LOG_API_REQUESTS=false

# 🔑 API EXTERNES
HADITH_API_KEY=your_production_hadith_key
```

### **2. Keystore Android Production**

```properties
# android/keystore.properties
storeFile=my-release-key.jks
storePassword=YOUR_SECURE_KEYSTORE_PASSWORD
keyAlias=my-key-alias
keyPassword=YOUR_SECURE_KEY_PASSWORD
```

### **3. Configuration serveur web**

#### **Nginx (Recommandé)**

```nginx
server {
    listen 443 ssl;
    server_name myadhanapp.com;

    # SSL Configuration
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;

    location /api/ {
        try_files $uri $uri/ /api/index.php?$query_string;

        # PHP Configuration
        location ~ \.php$ {
            fastcgi_pass php-fpm;
            fastcgi_index index.php;
            include fastcgi_params;
        }
    }
}
```

### **4. Sécurité des fichiers**

```bash
# Permissions critiques
chmod 600 .env
chmod 644 api/config.php
chmod 600 android/keystore.properties
```

---

## 🔍 CHECKLIST PRÉ-DÉPLOIEMENT

### **Configuration Stripe**

- [ ] Clés de production ajoutées dans `.env`
- [ ] Webhooks Stripe configurés sur le dashboard
- [ ] Tests de paiement réels effectués
- [ ] Mode test complètement désactivé

### **Sécurité**

- [ ] Mots de passe keystore complexes générés
- [ ] Variables d'environnement sécurisées
- [ ] HTTPS configuré avec certificat valide
- [ ] Logs de debug désactivés

### **Base de données**

- [ ] Backup de la BDD de production
- [ ] Index de performance appliqués
- [ ] Permissions utilisateur restreintes

### **Tests finaux**

- [ ] Test d'achat complet (1 centime)
- [ ] Test de notifications push
- [ ] Test sur appareil physique Android
- [ ] Vérification des webhooks Stripe

---

## 🚨 SÉCURITÉ CRITIQUE

⚠️ **JAMAIS faire :**

- Commiter les vraies clés dans Git
- Utiliser des mots de passe faibles
- Activer les logs de debug en production
- Exposer les endpoints de test

✅ **TOUJOURS faire :**

- Utiliser HTTPS uniquement
- Valider les certificats SSL
- Surveiller les logs d'erreurs
- Sauvegarder régulièrement

---

## 🎯 COMMANDES DE DÉPLOIEMENT

```bash
# 1. Build production Android
cd android && ./gradlew assembleRelease

# 2. Vérifier la signature
jarsigner -verify -certs app/build/outputs/apk/release/app-release.apk

# 3. Upload sur Play Store
# Utiliser Play Console ou fastlane
```

## 📞 SUPPORT

Si vous rencontrez des problèmes avec cette configuration, vérifiez :

1. **Logs d'erreur Apache/Nginx**
2. **Logs PHP** (`tail -f /var/log/php_errors.log`)
3. **Dashboard Stripe** (webhooks, paiements)
4. **Play Console** (rapports de plantage)

---

_Configuration effectuée le {{ date }} - Version production prête_ ✅
