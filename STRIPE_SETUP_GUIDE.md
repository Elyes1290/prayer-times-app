# 🚀 Guide de Configuration Stripe pour Prayer Times App

## 📋 **Prérequis**

1. **Compte Stripe** : Créez un compte sur [stripe.com](https://stripe.com)
2. **Serveur PHP** : Votre serveur doit supporter PHP 7.4+
3. **Base de données MySQL** : Pour stocker les abonnements

## 🔧 **Étapes de Configuration**

### **1. Configuration Stripe Dashboard**

#### **A. Créer les produits dans Stripe**

1. Connectez-vous à votre [dashboard Stripe](https://dashboard.stripe.com)
2. Allez dans **Products** → **Add Product**
3. Créez 3 produits :

**Produit Mensuel :**

- Name: `Premium Mensuel`
- Price: `1.99 EUR` (recurring monthly)
- Product ID: `premium_monthly_1_99`

**Produit Annuel :**

- Name: `Premium Annuel`
- Price: `19.99 EUR` (recurring yearly)
- Product ID: `premium_yearly_19_99`

**Produit Familial :**

- Name: `Premium Familial`
- Price: `29.99 EUR` (recurring yearly)
- Product ID: `premium_family_29_99`

#### **B. Récupérer les clés API**

1. Allez dans **Developers** → **API Keys**
2. Copiez :
   - **Publishable key**
   - **Secret key**

#### **C. Configurer les webhooks**

1. Allez dans **Developers** → **Webhooks**
2. Cliquez **Add endpoint**
3. URL: `https://votre-domaine.com/api/stripe/webhook`
4. Événements à écouter :
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

### **2. Configuration du Serveur**

#### **A. Installer Stripe PHP SDK**

```bash
cd /path/to/your/api
composer require stripe/stripe-php
```

#### **B. Configurer les variables d'environnement**

Dans votre fichier `api/config.php`, ajoutez :

```php
// Configuration Stripe
define('STRIPE_SECRET_KEY', 'sk_test_votre_cle_secrete');
define('STRIPE_PUBLISHABLE_KEY', 'pk_test_votre_cle_publique');
define('STRIPE_WEBHOOK_SECRET', 'whsec_votre_webhook_secret');
```

#### **C. Créer la base de données**

Exécutez le script SQL :

```bash
mysql -u username -p database_name < scripts/create-premium-subscriptions-table.sql
```

### **3. Configuration de l'Application**

#### **A. Mettre à jour la configuration Stripe**

Dans `utils/stripeConfig.ts`, remplacez :

```typescript
export const STRIPE_CONFIG = {
  publishableKey: "pk_test_votre_vraie_cle_publique",
  apiUrl: "https://votre-domaine.com/api/stripe",
  // ... autres configurations
};
```

#### **B. Tester la configuration**

1. Lancez l'application
2. Allez dans **Paramètres** → **Premium**
3. Testez un paiement avec la carte de test : `4242 4242 4242 4242`

## 🧪 **Cartes de Test Stripe**

Utilisez ces cartes pour tester :

| Carte                 | Résultat       | Description        |
| --------------------- | -------------- | ------------------ |
| `4242 4242 4242 4242` | ✅ Succès      | Paiement réussi    |
| `4000 0000 0000 0002` | ❌ Décliné     | Carte refusée      |
| `4000 0000 0000 9995` | ❌ Insuffisant | Fonds insuffisants |
| `4000 0000 0000 9987` | ❌ Expirée     | Carte expirée      |

## 🔒 **Sécurité**

### **A. Variables d'environnement**

- ✅ Utilisez des variables d'environnement pour les clés
- ❌ Ne committez jamais les clés secrètes
- ✅ Utilisez des clés de test pour le développement

### **B. Validation des paiements**

- ✅ Vérifiez toujours les signatures des webhooks
- ✅ Validez les montants côté serveur
- ✅ Utilisez HTTPS en production

### **C. Gestion des erreurs**

- ✅ Loggez toutes les erreurs de paiement
- ✅ Gérez les cas d'échec de paiement
- ✅ Notifiez les utilisateurs des problèmes

## 📊 **Monitoring**

### **A. Dashboard Stripe**

- Surveillez les paiements dans le dashboard Stripe
- Configurez des alertes pour les échecs de paiement
- Vérifiez les métriques de conversion

### **B. Logs de l'application**

- Surveillez les logs d'erreur de l'API
- Vérifiez les abonnements expirés
- Gérez les renouvellements automatiques

## 🚀 **Déploiement en Production**

### **A. Changer vers les clés live**

1. Remplacez `passe test` par `passe live`
2. Remplacez `passe test` par `pass live`
3. Mettez à jour l'URL de l'API

### **B. Configuration HTTPS**

- ✅ Utilisez HTTPS obligatoirement
- ✅ Configurez les certificats SSL
- ✅ Validez les domaines dans Stripe

### **C. Tests finaux**

1. Testez avec de vraies cartes
2. Vérifiez les webhooks
3. Testez les annulations d'abonnement

## 🆘 **Dépannage**

### **Problèmes courants :**

1. **Erreur "Invalid API key"**

   - Vérifiez que la clé est correcte
   - Assurez-vous d'utiliser la bonne clé (test/live)

2. **Webhook non reçu**

   - Vérifiez l'URL du webhook
   - Testez avec l'outil de test Stripe

3. **Paiement échoue**

   - Vérifiez les logs de l'API
   - Testez avec les cartes de test

4. **Abonnement non créé**
   - Vérifiez la base de données
   - Contrôlez les logs d'erreur

## 📞 **Support**

- **Documentation Stripe** : [stripe.com/docs](https://stripe.com/docs)
- **Support Stripe** : Via le dashboard Stripe
- **Logs d'erreur** : Vérifiez les logs de votre serveur

---

## ✅ **Checklist de Configuration**

- [ ] Compte Stripe créé
- [ ] Produits créés dans Stripe
- [ ] Clés API récupérées
- [ ] Webhooks configurés
- [ ] SDK Stripe installé
- [ ] Base de données créée
- [ ] Configuration mise à jour
- [ ] Tests effectués
- [ ] HTTPS configuré
- [ ] Monitoring en place

**🎉 Votre système de paiement Stripe est maintenant prêt !**
