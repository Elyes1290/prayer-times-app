#!/bin/bash

# 🚀 Script de déploiement automatisé - Prayer Times App
# Ce script déploie automatiquement l'application sur le serveur de production

set -e  # Arrêter en cas d'erreur

echo "🚀 Début du déploiement..."

# Configuration
SERVER_HOST="elyesnaitliman.ch"
SERVER_USER="prayer"
DEPLOY_PATH="/var/www/prayer-times-app"
BACKUP_PATH="/var/www/backups"

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages colorés
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌ $1${NC}"
}

# Vérification des prérequis
log "Vérification des prérequis..."

if [ -z "$SSH_PRIVATE_KEY" ]; then
    error "Variable SSH_PRIVATE_KEY non définie"
    exit 1
fi

if [ -z "$DB_PASSWORD" ]; then
    error "Variable DB_PASSWORD non définie"
    exit 1
fi

# Création du backup
log "Création du backup..."
ssh -i ~/.ssh/id_rsa $SERVER_USER@$SERVER_HOST << EOF
    mkdir -p $BACKUP_PATH
    if [ -d "$DEPLOY_PATH" ]; then
        tar -czf $BACKUP_PATH/backup-\$(date +%Y%m%d-%H%M%S).tar.gz -C $DEPLOY_PATH .
        log "Backup créé avec succès"
    else
        warn "Aucun déploiement existant à sauvegarder"
    fi
EOF

# Synchronisation des fichiers
log "Synchronisation des fichiers..."
rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude '.expo' \
    --exclude 'coverage' \
    --exclude '*.log' \
    ./ $SERVER_USER@$SERVER_HOST:$DEPLOY_PATH/

# Installation des dépendances sur le serveur
log "Installation des dépendances..."
ssh -i ~/.ssh/id_rsa $SERVER_USER@$SERVER_HOST << EOF
    cd $DEPLOY_PATH
    npm ci --production
    log "Dépendances installées"
EOF

# Mise à jour de la base de données
log "Mise à jour de la base de données..."
ssh -i ~/.ssh/id_rsa $SERVER_USER@$SERVER_HOST << EOF
    cd $DEPLOY_PATH
    if [ -f "scripts/create-prayer-database-final.sql" ]; then
        mysql -u prayer -p$DB_PASSWORD ff42hr_MyAdhan < scripts/create-prayer-database-final.sql
        log "Base de données mise à jour"
    else
        warn "Script SQL non trouvé"
    fi
EOF

# Redémarrage des services
log "Redémarrage des services..."
ssh -i ~/.ssh/id_rsa $SERVER_USER@$SERVER_HOST << EOF
    sudo systemctl reload nginx
    sudo systemctl restart php8.1-fpm
    log "Services redémarrés"
EOF

# Tests de santé
log "Tests de santé..."
sleep 5  # Attendre que les services redémarrent

HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" https://$SERVER_HOST/api/test-api.php)

if [ "$HEALTH_CHECK" = "200" ]; then
    log "✅ Déploiement réussi - API fonctionnelle"
else
    error "❌ Échec du déploiement - API non accessible (HTTP $HEALTH_CHECK)"
    exit 1
fi

# Nettoyage des anciens backups (garder seulement les 5 derniers)
log "Nettoyage des anciens backups..."
ssh -i ~/.ssh/id_rsa $SERVER_USER@$SERVER_HOST << EOF
    cd $BACKUP_PATH
    ls -t *.tar.gz | tail -n +6 | xargs -r rm
    log "Anciens backups nettoyés"
EOF

log "🎉 Déploiement terminé avec succès !" 