#!/bin/bash
# Script d'installation serveur audio
# À exécuter sur votre VPS Contabo

echo "🚀 Installation serveur audio optimisé..."

# Mise à jour système
apt update && apt upgrade -y

# Installation des dépendances
apt install -y nginx nodejs npm ffmpeg certbot python3-certbot-nginx ufw redis-server

# Configuration firewall
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable

# Création des dossiers
mkdir -p /var/www/audio
chown -R www-data:www-data /var/www/audio

# Configuration NGINX
cp nginx-audio-server.conf /etc/nginx/sites-available/audio-server
ln -sf /etc/nginx/sites-available/audio-server /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test configuration NGINX
nginx -t

# SSL Let's Encrypt
# certbot --nginx -d votre-serveur.com

# Redémarrage services
systemctl enable nginx redis-server
systemctl restart nginx redis-server

echo "✅ Installation terminée !"
echo "📋 Prochaines étapes :"
echo "   1. Configurer DNS : votre-serveur.com → IP serveur"
echo "   2. Configurer SSL : certbot --nginx -d votre-serveur.com"
echo "   3. Uploader les fichiers audio"
echo "   4. Modifier l'app React Native"
