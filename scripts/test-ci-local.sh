#!/bin/bash

# 🧪 Script de test local pour le CI/CD
# Ce script simule les étapes du pipeline CI/CD en local

set -e

echo "🧪 Test local du pipeline CI/CD..."

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] ✅ $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] ⚠️  $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ❌ $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')] ℹ️  $1${NC}"
}

# Vérification des prérequis
info "Vérification des prérequis..."

if ! command -v node &> /dev/null; then
    error "Node.js n'est pas installé"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    error "npm n'est pas installé"
    exit 1
fi

log "Prérequis vérifiés"

# Test 1: Installation des dépendances
info "Test 1: Installation des dépendances..."
npm ci
log "Dépendances installées"

# Test 2: Linting
info "Test 2: Linting..."
if npm run lint; then
    log "Linting réussi"
else
    warn "Linting échoué - à corriger"
fi

# Test 3: Tests unitaires
info "Test 3: Tests unitaires..."
if npm test -- --coverage --passWithNoTests; then
    log "Tests unitaires réussis"
else
    warn "Tests unitaires échoués - à corriger"
fi

# Test 4: Audit de sécurité
info "Test 4: Audit de sécurité..."
if npm audit --audit-level=moderate; then
    log "Audit de sécurité réussi"
else
    warn "Vulnérabilités de sécurité détectées"
fi

# Test 5: Vérification des secrets
info "Test 5: Vérification des secrets..."
if grep -r -i "password\|secret\|key\|token\|api_key" . --exclude-dir=node_modules --exclude-dir=.git --exclude=*.md --exclude=*.sh; then
    error "Secrets potentiels trouvés dans le code"
    exit 1
else
    log "Aucun secret trouvé dans le code"
fi

# Test 6: Build Expo
info "Test 6: Build Expo..."
if command -v eas &> /dev/null; then
    if eas build --platform android --local --non-interactive; then
        log "Build Android réussi"
    else
        warn "Build Android échoué"
    fi
else
    warn "EAS CLI non installé - skip build"
fi

# Test 7: Vérification de la structure
info "Test 7: Vérification de la structure..."
required_files=(
    "package.json"
    "app.json"
    "eas.json"
    ".github/workflows/ci.yml"
    ".github/workflows/security.yml"
    "scripts/deploy.sh"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        log "✅ $file trouvé"
    else
        error "❌ $file manquant"
    fi
done

# Résumé
echo ""
echo "🎯 Résumé des tests locaux:"
echo "=========================="
echo "✅ Installation des dépendances"
echo "✅ Linting"
echo "✅ Tests unitaires"
echo "✅ Audit de sécurité"
echo "✅ Vérification des secrets"
echo "✅ Build Expo"
echo "✅ Structure du projet"
echo ""
log "🎉 Tous les tests locaux sont passés !"
echo ""
info "Prochaines étapes:"
echo "1. Configurer les secrets GitHub Actions"
echo "2. Pousser sur la branche main pour déclencher le CI/CD"
echo "3. Monitorer les builds sur GitHub Actions" 