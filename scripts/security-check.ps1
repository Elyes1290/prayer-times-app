# 🔐 Script de vérification de sécurité pour Prayer Times App (PowerShell)
# Vérifie qu'aucun fichier sensible n'est exposé dans le repository

Write-Host "🔍 VÉRIFICATION DE SÉCURITÉ - Prayer Times App" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

# Variables
$Errors = 0
$Warnings = 0

# 1. Vérifier les fichiers sensibles dans le repository
Write-Host "`n📁 Vérification des fichiers sensibles..." -ForegroundColor Yellow

$SensitiveFiles = @(
    "google-services.json",
    "GoogleService-Info.plist",
    ".env",
    ".env.local",
    ".env.production",
    "android/gradle.properties",
    "android/app/google-services.json",
    "ios/GoogleService-Info.plist"
)

foreach ($file in $SensitiveFiles) {
    $isTracked = git ls-files | Select-String -Pattern $file -Quiet
    if ($isTracked) {
        Write-Host "❌ ERREUR: $file est dans le repository!" -ForegroundColor Red
        $Errors++
    } else {
        Write-Host "✅ $file est correctement ignoré" -ForegroundColor Green
    }
}

# 2. Vérifier les patterns de secrets dans les fichiers
Write-Host "`n🔑 Vérification des patterns de secrets..." -ForegroundColor Yellow

$SecretPatterns = @(
    "password.*=",
    "secret.*=",
    "key.*=",
    "token.*=",
    "api_key.*=",
    "AIza[A-Za-z0-9_-]{35}",
    "sk_[a-zA-Z0-9]{24}",
    "pk_[a-zA-Z0-9]{24}"
)

foreach ($pattern in $SecretPatterns) {
    $hasSecret = git diff --cached | Select-String -Pattern $pattern -Quiet
    if ($hasSecret) {
        Write-Host "❌ ERREUR: Pattern de secret détecté: $pattern" -ForegroundColor Red
        $Errors++
    }
}

# 3. Vérifier les fichiers de configuration
Write-Host "`n⚙️ Vérification des fichiers de configuration..." -ForegroundColor Yellow

$ConfigFiles = @(
    "app.config.js",
    "app.config.ts",
    "firebase-config.json",
    "firebase-config.js",
    "firebase-config.ts"
)

foreach ($file in $ConfigFiles) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        if ($content -match "your_.*_here|placeholder|example") {
            Write-Host "⚠️ ATTENTION: $file contient des valeurs d'exemple" -ForegroundColor Yellow
            $Warnings++
        } else {
            Write-Host "✅ $file semble configuré" -ForegroundColor Green
        }
    }
}

# 4. Vérifier les certificats et clés
Write-Host "`n🔐 Vérification des certificats et clés..." -ForegroundColor Yellow

$CertPatterns = @(
    "*.keystore",
    "*.jks",
    "*.p8",
    "*.p12",
    "*.key",
    "*.pem"
)

foreach ($pattern in $CertPatterns) {
    $certFiles = Get-ChildItem -Path . -Name $pattern -Recurse -ErrorAction SilentlyContinue | Where-Object { $_ -notmatch "node_modules|\.git" }
    if ($certFiles) {
        Write-Host "⚠️ ATTENTION: Fichiers de certificat trouvés: $pattern" -ForegroundColor Yellow
        $Warnings++
    }
}

# 5. Vérifier les variables d'environnement
Write-Host "`n🌍 Vérification des variables d'environnement..." -ForegroundColor Yellow

if (Test-Path ".env") {
    $envContent = Get-Content ".env" -Raw
    if ($envContent -match "your_.*_here|placeholder|example") {
        Write-Host "⚠️ ATTENTION: .env contient des valeurs d'exemple" -ForegroundColor Yellow
        $Warnings++
    } else {
        Write-Host "✅ .env semble configuré" -ForegroundColor Green
    }
} else {
    Write-Host "⚠️ ATTENTION: Fichier .env manquant" -ForegroundColor Yellow
    $Warnings++
}

# 6. Vérifier le .gitignore
Write-Host "`n📋 Vérification du .gitignore..." -ForegroundColor Yellow

$GitignorePatterns = @(
    "google-services.json",
    "GoogleService-Info.plist",
    ".env",
    "*.keystore",
    "*.jks",
    "*.p8",
    "*.p12",
    "*.key",
    "*.pem"
)

$gitignoreContent = Get-Content ".gitignore" -Raw
foreach ($pattern in $GitignorePatterns) {
    if ($gitignoreContent -match [regex]::Escape($pattern)) {
        Write-Host "✅ $pattern est dans .gitignore" -ForegroundColor Green
    } else {
        Write-Host "❌ ERREUR: $pattern manque dans .gitignore" -ForegroundColor Red
        $Errors++
    }
}

# Résumé
Write-Host ""
Write-Host "RESUME DE LA VERIFICATION"
Write-Host "=============================="

if ($Errors -eq 0 -and $Warnings -eq 0) {
    Write-Host "PARFAIT Aucun probleme de securite detecte"
    exit 0
} elseif ($Errors -eq 0) {
    Write-Host "ATTENTION"
    Write-Host $Warnings
    Write-Host "avertissement detecte"
    exit 0
} else {
    Write-Host "Erreur"
    exit 1
} 