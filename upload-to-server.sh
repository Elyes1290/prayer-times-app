#!/bin/bash
# Script d'upload vers serveur personnel

echo "📤 Upload des fichiers vers votre-serveur.com..."

# Variables
LOCAL_DIR="./migrated_audio"
REMOTE_USER="root"
REMOTE_HOST="votre-serveur.com"
REMOTE_PATH="/var/www/audio"

# Vérification connexion SSH
echo "🔐 Test de connexion SSH..."
ssh -o ConnectTimeout=10 $REMOTE_USER@$REMOTE_HOST "echo 'Connexion OK'" || {
    echo "❌ Impossible de se connecter à $REMOTE_HOST"
    echo "💡 Vérifiez :"
    echo "   • Clé SSH configurée"
    echo "   • Serveur accessible"
    echo "   • Utilisateur correct"
    exit 1
}

# Upload avec rsync (avec progression)
echo "📤 Upload en cours..."
rsync -avz --progress \
    --exclude '*.tmp' \
    --exclude '*.log' \
    "$LOCAL_DIR/" \
    "$REMOTE_USER@$REMOTE_HOST:$REMOTE_PATH/"

# Permissions
ssh $REMOTE_USER@$REMOTE_HOST "chown -R www-data:www-data $REMOTE_PATH && chmod -R 755 $REMOTE_PATH"

# Test
echo "🧪 Test d'accès..."
curl -s -o /dev/null -w "%{http_code}" "https://$REMOTE_HOST/audio/premium/adhan/adhamalsharqawe.mp3" | grep -q "200" && {
    echo "✅ Upload réussi ! Serveur accessible."
} || {
    echo "⚠️ Upload terminé mais test d'accès échoué"
    echo "💡 Vérifiez la configuration NGINX et SSL"
}

echo "🎯 Migration terminée !"
echo "💰 Économies : 173 CHF → 7 CHF/mois (-96%)"
