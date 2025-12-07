#!/bin/bash

# Hook EAS Build - Copie des sons MP3 dans le bundle iOS
# Ce script s'exécute APRÈS l'installation des dépendances

set -e

echo "🎵 [EAS Hook] Post-install: Configuration des sons pour iOS..."

# Vérifier si on est sur un build iOS
if [ "$EAS_BUILD_PLATFORM" != "ios" ]; then
  echo "ℹ️ Build Android, skip configuration des sons iOS"
  exit 0
fi

echo "📱 Build iOS détecté, préparation des sons..."

# Attendre que le dossier ios soit créé par le prebuild
if [ ! -d "ios" ]; then
  echo "⏳ Dossier ios pas encore créé, ce script sera ré-exécuté après prebuild"
  exit 0
fi

# Trouver le nom du projet iOS
IOS_PROJECT=$(find ios -name "*.xcodeproj" -maxdepth 1 | head -1)
if [ -z "$IOS_PROJECT" ]; then
  echo "⚠️ Projet iOS non trouvé, skip"
  exit 0
fi

PROJECT_NAME=$(basename "$IOS_PROJECT" .xcodeproj)
TARGET_DIR="ios/$PROJECT_NAME"

echo "📱 Projet iOS: $PROJECT_NAME"
echo "📂 Dossier cible: $TARGET_DIR"

# Vérifier que le dossier Android raw existe (contient les VRAIS MP3)
ANDROID_RAW_DIR="android/app/src/main/res/raw"
if [ ! -d "$ANDROID_RAW_DIR" ]; then
  echo "❌ Dossier $ANDROID_RAW_DIR introuvable!"
  exit 1
fi

# Copier TOUS les MP3 depuis le dossier Android (VRAIS Adhan complets)
echo "🎵 Copie des fichiers MP3 depuis Android vers le bundle iOS..."
echo "   (Utilise les VRAIS Adhan, pas les previews de 20 secondes)"
COPIED=0
for mp3_file in $ANDROID_RAW_DIR/*.mp3; do
  if [ -f "$mp3_file" ]; then
    filename=$(basename "$mp3_file")
    cp -v "$mp3_file" "$TARGET_DIR/"
    echo "  ✅ Copié: $filename"
    ((COPIED++))
  fi
done

echo "✅ $COPIED fichiers MP3 copiés dans le bundle iOS"
echo ""
echo "ℹ️ Le plugin Expo (withIosSounds.js) va ajouter ces fichiers au projet Xcode"
echo "   pendant le prebuild, garantissant qu'ils sont dans Copy Bundle Resources"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ Configuration terminée !"
echo "ℹ️ Les sons seront disponibles pour UNNotificationSound"
echo "═══════════════════════════════════════════════════════════"
