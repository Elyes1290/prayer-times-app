#!/bin/bash
# Script de téléchargement Firebase → Local
# Assurez-vous d'avoir installé et configuré gsutil

echo "📥 Début du téléchargement Firebase Storage..."

gsutil -m cp -r gs://myadhan-6edc7.firebasestorage.app/premium/adhan/* migrated_audio\premium\adhan/
gsutil -m cp -r gs://myadhan-6edc7.firebasestorage.app/premium/quran/luhaidan/* migrated_audio\premium\quran\luhaidan/
gsutil -m cp -r gs://myadhan-6edc7.firebasestorage.app/premium/quran/shuraim/* migrated_audio\premium\quran\shuraim/
gsutil -m cp -r gs://myadhan-6edc7.firebasestorage.app/premium/quran/sudais/* migrated_audio\premium\quran\sudais/

echo "✅ Téléchargement terminé !"
echo "📁 Fichiers dans : ./migrated_audio"
