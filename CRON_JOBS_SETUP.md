# ⏰ CONFIGURATION CRON JOBS - GESTION AUTOMATIQUE DES EXPIRATIONS

## 🎯 **POURQUOI C'EST NÉCESSAIRE**

Pour une app en production, vous DEVEZ avoir des tâches automatiques qui :

- ✅ Désactivent les abonnements expirés automatiquement
- ✅ Nettoient les tokens expirés
- ✅ Surveillent les paiements échoués
- ✅ Maintiennent la base de données propre

---

## 🛠️ **CONFIGURATION SUR VOTRE SERVEUR**

### **1. Variables d'environnement supplémentaires**

Ajoutez dans votre `.env` :

```bash
# Token pour les tâches de maintenance automatique
CRON_TOKEN=votre_token_cron_ultra_securise_2024

# Configuration maintenance
MAINTENANCE_ENABLED=true
CLEANUP_EXPIRED_TOKENS_ENABLED=true
CLEANUP_SUBSCRIPTIONS_ENABLED=true
```

### **2. Configuration Cron Jobs**

Connectez-vous en SSH sur votre serveur et configurez ces tâches :

```bash
# Éditer le crontab
crontab -e

# Ajouter ces lignes dans votre crontab :

# ========================================
# PRAYER TIMES APP - MAINTENANCE AUTOMATIQUE
# ========================================

# 🕐 Vérifier les abonnements expirés (toutes les heures)
0 * * * * curl -s "https://myadhanapp.com/api/check-expired-premium.php?cron_token=votre_token_cron_ultra_securise_2024" > /dev/null 2>&1

# 🧹 Nettoyer les tokens expirés (tous les jours à 2h du matin)
0 2 * * * curl -s "https://myadhanapp.com/api/cleanup-expired-tokens.php?cron_token=votre_token_cron_ultra_securise_2024" > /dev/null 2>&1

# 🔄 Nettoyer les abonnements (tous les jours à 3h du matin)
0 3 * * * curl -s "https://myadhanapp.com/api/cleanup-subscriptions.php?cron_token=votre_token_cron_ultra_securise_2024" > /dev/null 2>&1

# 📊 Monitoring général (tous les jours à 6h du matin)
0 6 * * * curl -s "https://myadhanapp.com/api/monitoring.php?cron_token=votre_token_cron_ultra_securise_2024" > /dev/null 2>&1

# 🗑️ Procédure MySQL directe (alternative - tous les jours à 4h)
0 4 * * * mysql -h ff42hr.myd.infomaniak.com -u ff42hr_prayer -p'VOTRE_MOT_DE_PASSE' ff42hr_MyAdhan -e "CALL sp_cleanup_expired_subscriptions();" > /dev/null 2>&1
```

### **3. Vérifier que les cron jobs fonctionnent**

```bash
# Voir les cron jobs actifs
crontab -l

# Tester manuellement un cron job
curl "https://myadhanapp.com/api/check-expired-premium.php?cron_token=votre_token_cron_ultra_securise_2024"

# Voir les logs cron
tail -f /var/log/cron.log

# Voir les logs de votre app
tail -f /var/log/php_errors.log
```

---

## 🔧 **ALTERNATIVE : CONFIGURATION AVEC WGET**

Si `curl` n'est pas disponible, utilisez `wget` :

```bash
# Remplacer les lignes curl par :
0 * * * * wget -q -O - "https://myadhanapp.com/api/check-expired-premium.php?cron_token=votre_token" > /dev/null 2>&1
0 2 * * * wget -q -O - "https://myadhanapp.com/api/cleanup-expired-tokens.php?cron_token=votre_token" > /dev/null 2>&1
0 3 * * * wget -q -O - "https://myadhanapp.com/api/cleanup-subscriptions.php?cron_token=votre_token" > /dev/null 2>&1
```

---

## 📊 **MONITORING DES CRON JOBS**

### **1. Logs automatiques**

Créez un fichier de log dédié :

```bash
# Modifier les cron jobs pour logger :
0 * * * * curl -s "https://myadhanapp.com/api/check-expired-premium.php?cron_token=votre_token" >> /var/log/prayer-app-cron.log 2>&1
```

### **2. Surveillance des échecs**

```bash
# Script pour surveiller les échecs (optionnel)
#!/bin/bash
# check-cron-health.sh

LAST_RUN=$(tail -1 /var/log/prayer-app-cron.log | grep -o '"executed_at":"[^"]*"' | cut -d'"' -f4)
CURRENT_TIME=$(date -u +"%Y-%m-%d %H:%M:%S")

if [ -z "$LAST_RUN" ]; then
    echo "⚠️ Aucune exécution récente trouvée"
    # Envoyer alerte email ou notification
fi
```

---

## 🆘 **DÉPANNAGE CRON JOBS**

### **Problème : Cron ne s'exécute pas**

```bash
# Vérifier que le service cron est actif
sudo systemctl status cron

# Redémarrer le service cron
sudo systemctl restart cron

# Vérifier les permissions
ls -la /var/spool/cron/crontabs/
```

### **Problème : Token invalide**

```bash
# Vérifier que le token est bien configuré
grep CRON_TOKEN /path/to/your/.env

# Tester manuellement
curl "https://myadhanapp.com/api/check-expired-premium.php?cron_token=VOTRE_TOKEN"
```

### **Problème : PHP ou MySQL non accessible**

```bash
# Vérifier PHP CLI
which php
php --version

# Vérifier MySQL
which mysql
mysql --version

# Tester la connexion DB
mysql -h ff42hr.myd.infomaniak.com -u ff42hr_prayer -p
```

---

## 📅 **PLANNING DES TÂCHES RECOMMANDÉ**

| Heure                 | Tâche                | Fréquence | Importance |
| --------------------- | -------------------- | --------- | ---------- |
| **Toutes les heures** | Vérifier expirations | Critique  | 🔴         |
| **2h du matin**       | Nettoyer tokens      | Haute     | 🟡         |
| **3h du matin**       | Nettoyer abonnements | Haute     | 🟡         |
| **4h du matin**       | Procédure MySQL      | Moyenne   | 🟢         |
| **6h du matin**       | Monitoring           | Moyenne   | 🟢         |

---

## 🎯 **COMMANDES RAPIDES POUR TESTER**

```bash
# Test immédiat de tous les systèmes
curl "https://myadhanapp.com/api/check-expired-premium.php?cron_token=VOTRE_TOKEN"
curl "https://myadhanapp.com/api/cleanup-expired-tokens.php?cron_token=VOTRE_TOKEN"
curl "https://myadhanapp.com/api/cleanup-subscriptions.php?cron_token=VOTRE_TOKEN"

# Vérifier les vues MySQL
mysql -h ff42hr.myd.infomaniak.com -u ff42hr_prayer -p ff42hr_MyAdhan -e "SELECT * FROM v_expired_subscriptions;"
mysql -h ff42hr.myd.infomaniak.com -u ff42hr_prayer -p ff42hr_MyAdhan -e "SELECT * FROM v_expiring_soon_subscriptions;"
```

---

## ✅ **CHECKLIST FINAL**

- [ ] Variables CRON_TOKEN ajoutées dans .env
- [ ] Cron jobs configurés dans crontab
- [ ] Tests manuels réussis
- [ ] Logs de monitoring configurés
- [ ] Service cron actif et fonctionnel

---

**Avec cette configuration, vos abonnements seront automatiquement gérés 24h/24 !** ⏰
