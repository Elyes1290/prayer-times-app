# Script de renommage des adhans premium .caf
# Ajoute le prefixe "adhan_" et convertit en format snake_case

$sourceDir = ".\temp-premium-caf"
$destDir = ".\assets\sounds-ios"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "RENOMMAGE DES ADHANS PREMIUM (.caf)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Dossier source: $sourceDir" -ForegroundColor Yellow
Write-Host "Dossier destination: $destDir" -ForegroundColor Yellow
Write-Host ""

# Verifier que le dossier source existe
if (-not (Test-Path $sourceDir)) {
    Write-Host "ERREUR: Le dossier $sourceDir n'existe pas!" -ForegroundColor Red
    Write-Host "Creez le dossier et copiez-y vos fichiers .caf:" -ForegroundColor Yellow
    Write-Host "   New-Item -ItemType Directory -Path '$sourceDir' -Force" -ForegroundColor Gray
    exit 1
}

# Creer le dossier destination s'il n'existe pas
if (-not (Test-Path $destDir)) {
    Write-Host "Creation du dossier: $destDir" -ForegroundColor Green
    New-Item -ItemType Directory -Path $destDir -Force | Out-Null
}

# Lister tous les fichiers .caf
$cafFiles = Get-ChildItem "$sourceDir\*.caf"

if ($cafFiles.Count -eq 0) {
    Write-Host "Aucun fichier .caf trouve dans $sourceDir" -ForegroundColor Yellow
    Write-Host "Telechargez les fichiers .caf depuis:" -ForegroundColor Yellow
    Write-Host "   myadhanapp.com/private/premium/iosCaf/" -ForegroundColor Gray
    exit 0
}

Write-Host "Fichiers trouves: $($cafFiles.Count)" -ForegroundColor Green
Write-Host ""

# Traiter chaque fichier
$renamedCount = 0
$skippedCount = 0

foreach ($file in $cafFiles) {
    $oldName = $file.Name
    $baseName = $file.BaseName
    
    # Si le fichier commence deja par "adhan_", on skip
    if ($baseName.StartsWith("adhan_")) {
        Write-Host "SKIP: $oldName (deja prefixe)" -ForegroundColor Gray
        $skippedCount++
        continue
    }
    
    # Conversion: "Azan Madina" -> "adhan_azan_madina"
    $newBaseName = "adhan_" + $baseName.Replace(" ", "_").Replace("-", "_").ToLower()
    $newName = "$newBaseName.caf"
    $newPath = Join-Path $destDir $newName
    
    # Afficher la transformation
    Write-Host "$oldName" -ForegroundColor White
    Write-Host "   -> $newName" -ForegroundColor Green
    
    # Copier le fichier vers assets/sounds-ios/ avec le nouveau nom
    try {
        Copy-Item -Path $file.FullName -Destination $newPath -Force -ErrorAction Stop
        $renamedCount++
    } catch {
        Write-Host "   ERREUR: $_" -ForegroundColor Red
    }
    
    Write-Host ""
}

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "TERMINE!" -ForegroundColor Green
Write-Host "   - $renamedCount fichiers copies et renommes dans $destDir" -ForegroundColor Green
Write-Host "   - $skippedCount fichiers ignores (deja prefixes)" -ForegroundColor Yellow
Write-Host ""
Write-Host "PROCHAINE ETAPE:" -ForegroundColor Cyan
Write-Host "   1. Verifiez les fichiers dans: $destDir" -ForegroundColor White
Write-Host "   2. Lancez: eas build --profile preview --platform ios" -ForegroundColor White
Write-Host "========================================================" -ForegroundColor Cyan
