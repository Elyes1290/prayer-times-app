#!/bin/bash

# 🔐 Script de vérification de sécurité pour Prayer Times App
# Vérifie qu'aucun fichier sensible n'est exposé dans le repository

echo "🔍 VÉRIFICATION DE SÉCURITÉ - Prayer Times App"
echo "=============================================="

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variables
ERRORS=0
WARNINGS=0

# 1. Vérifier les fichiers sensibles dans le repository
echo -e "\n📁 Vérification des fichiers sensibles..."

SENSITIVE_FILES=(
  "google-services.json"
  "GoogleService-Info.plist"
  ".env"
  ".env.local"
  ".env.production"
  "android/gradle.properties"
  "android/app/google-services.json"
  "ios/GoogleService-Info.plist"
)

for file in "${SENSITIVE_FILES[@]}"; do
  if git ls-files | grep -q "$file"; then
    echo -e "${RED}❌ ERREUR: $file est dans le repository!${NC}"
    ERRORS=$((ERRORS + 1))
  else
    echo -e "${GREEN}✅ $file est correctement ignoré${NC}"
  fi
done

# 2. Vérifier les patterns de secrets dans les fichiers
echo -e "\n🔑 Vérification des patterns de secrets..."

SECRET_PATTERNS=(
  "password.*="
  "secret.*="
  "key.*="
  "token.*="
  "api_key.*="
  "AIza[A-Za-z0-9_-]{35}"
  "sk_[a-zA-Z0-9]{24}"
  "pk_[a-zA-Z0-9]{24}"
)

for pattern in "${SECRET_PATTERNS[@]}"; do
  if git diff --cached | grep -i "$pattern" > /dev/null 2>&1; then
    echo -e "${RED}❌ ERREUR: Pattern de secret détecté: $pattern${NC}"
    ERRORS=$((ERRORS + 1))
  fi
done

# 3. Vérifier les fichiers de configuration
echo -e "\n⚙️ Vérification des fichiers de configuration..."

CONFIG_FILES=(
  "app.config.js"
  "app.config.ts"
  "firebase-config.json"
  "firebase-config.js"
  "firebase-config.ts"
)

for file in "${CONFIG_FILES[@]}"; do
  if [ -f "$file" ]; then
    if grep -q "your_.*_here\|placeholder\|example" "$file"; then
      echo -e "${YELLOW}⚠️ ATTENTION: $file contient des valeurs d'exemple${NC}"
      WARNINGS=$((WARNINGS + 1))
    else
      echo -e "${GREEN}✅ $file semble configuré${NC}"
    fi
  fi
done

# 4. Vérifier les certificats et clés
echo -e "\n🔐 Vérification des certificats et clés..."

CERT_FILES=(
  "*.keystore"
  "*.jks"
  "*.p8"
  "*.p12"
  "*.key"
  "*.pem"
)

for pattern in "${CERT_FILES[@]}"; do
  if find . -name "$pattern" -not -path "./node_modules/*" -not -path "./.git/*" | grep -q .; then
    echo -e "${YELLOW}⚠️ ATTENTION: Fichiers de certificat trouvés: $pattern${NC}"
    WARNINGS=$((WARNINGS + 1))
  fi
done

# 5. Vérifier les variables d'environnement
echo -e "\n🌍 Vérification des variables d'environnement..."

if [ -f ".env" ]; then
  if grep -q "your_.*_here\|placeholder\|example" ".env"; then
    echo -e "${YELLOW}⚠️ ATTENTION: .env contient des valeurs d'exemple${NC}"
    WARNINGS=$((WARNINGS + 1))
  else
    echo -e "${GREEN}✅ .env semble configuré${NC}"
  fi
else
  echo -e "${YELLOW}⚠️ ATTENTION: Fichier .env manquant${NC}"
  WARNINGS=$((WARNINGS + 1))
fi

# 6. Vérifier le .gitignore
echo -e "\n📋 Vérification du .gitignore..."

GITIGNORE_PATTERNS=(
  "google-services.json"
  "GoogleService-Info.plist"
  ".env"
  "*.keystore"
  "*.jks"
  "*.p8"
  "*.p12"
  "*.key"
  "*.pem"
)

for pattern in "${GITIGNORE_PATTERNS[@]}"; do
  if grep -q "$pattern" ".gitignore"; then
    echo -e "${GREEN}✅ $pattern est dans .gitignore${NC}"
  else
    echo -e "${RED}❌ ERREUR: $pattern manque dans .gitignore${NC}"
    ERRORS=$((ERRORS + 1))
  fi
done

# Résumé
echo -e "\n📊 RÉSUMÉ DE LA VÉRIFICATION"
echo "=============================="

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo -e "${GREEN}🎉 PARFAIT! Aucun problème de sécurité détecté${NC}"
  exit 0
elif [ $ERRORS -eq 0 ]; then
  echo -e "${YELLOW}⚠️ ATTENTION: $WARNINGS avertissement(s) détecté(s)${NC}"
  exit 0
else
  echo -e "${RED}❌ ERREUR: $ERRORS erreur(s) critique(s) détectée(s)${NC}"
  echo -e "${RED}❌ ERREUR: $WARNINGS avertissement(s) détecté(s)${NC}"
  echo -e "\n🔧 ACTIONS REQUISES:"
  echo "1. Retirez les fichiers sensibles du repository"
  echo "2. Ajoutez les patterns manquants au .gitignore"
  echo "3. Remplacez les valeurs d'exemple par de vraies valeurs"
  echo "4. Relancez ce script pour vérifier"
  exit 1
fi 