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

# ✅ iOS EXIGE le format .caf (Core Audio Format) pour les notifications
# Les MP3 ne fonctionnent PAS avec UNNotificationSound !
IOS_SOUNDS_DIR="assets/sounds-ios"
if [ ! -d "$IOS_SOUNDS_DIR" ]; then
  echo "❌ Dossier $IOS_SOUNDS_DIR introuvable!"
  echo "   ℹ️ Créez le dossier assets/sounds-ios/ avec les fichiers .caf"
  exit 1
fi

# Copier les fichiers .caf (format natif iOS pour notifications)
echo "🎵 Copie des fichiers .caf depuis assets/sounds-ios/ vers le bundle iOS..."
echo "   (Format CAF = Core Audio Format, SEUL format accepté par iOS pour notifications)"
COPIED=0
for caf_file in $IOS_SOUNDS_DIR/*.caf; do
  if [ -f "$caf_file" ]; then
    filename=$(basename "$caf_file")
    cp -v "$caf_file" "$TARGET_DIR/"
    echo "  ✅ Copié: $filename"
    ((COPIED++))
  fi
done

echo "✅ $COPIED fichiers .caf copiés dans le bundle iOS"
echo ""

# 🎵 SUPPRIMÉ : Plus besoin de copier les MP3 dans le bundle iOS
# Les MP3 complets sont maintenant dans assets/soundsComplete-ios/
# et sont chargés via expo-asset (comme les previews)
echo "ℹ️ MP3 complets chargés via assets React Native (assets/soundsComplete-ios/)"
echo "   Plus besoin de les copier dans le bundle iOS"

echo ""
echo "ℹ️ Le plugin Expo (withIosSounds.js) va ajouter les fichiers .caf au projet Xcode"
echo "   pendant le prebuild, garantissant qu'ils sont dans Copy Bundle Resources"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ Configuration terminée !"
echo "ℹ️ Sons .caf → notifications | MP3 complets → assets React Native"
echo "═══════════════════════════════════════════════════════════"
