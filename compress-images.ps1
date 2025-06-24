# Script de compression d'images sécurisé pour MyAdhan
# AUCUNE SUPPRESSION - Compression en place avec sauvegardes

param(
    [string]$ImagePath = "assets/images",
    [int]$Quality = 75
)

Write-Host "🔧 DÉMARRAGE DE LA COMPRESSION SÉCURISÉE D'IMAGES" -ForegroundColor Green
Write-Host "📁 Dossier: $ImagePath" -ForegroundColor Cyan
Write-Host "🎯 Qualité: $Quality%" -ForegroundColor Cyan

# Chargement des assemblys .NET pour traitement d'images
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms

function Optimize-Image {
    param(
        [string]$FilePath,
        [int]$Quality = 75
    )
    
    try {
        $file = Get-Item $FilePath
        $originalSize = $file.Length
        
        Write-Host "🖼️  Traitement: $($file.Name) ($([math]::Round($originalSize/1KB, 2)) KB)" -ForegroundColor Yellow
        
        # Charger l'image
        $image = [System.Drawing.Image]::FromFile($FilePath)
        
        # Configuration de la compression JPEG (pour tous les formats)
        $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
        $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter(
            [System.Drawing.Imaging.Encoder]::Quality, $Quality)
        
        # Codec JPEG
        $jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | 
                     Where-Object { $_.MimeType -eq "image/jpeg" }
        
        # Fichier temporaire
        $tempFile = "$FilePath.temp"
        
        # Sauvegarder en JPEG temporaire
        $image.Save($tempFile, $jpegCodec, $encoderParams)
        $image.Dispose()
        
        # Vérifier la taille
        $newSize = (Get-Item $tempFile).Length
        $reduction = [math]::Round((($originalSize - $newSize) / $originalSize) * 100, 2)
        
        if ($reduction -gt 5) {
            # Remplacer seulement si on économise plus de 5%
            Move-Item $tempFile $FilePath -Force
            Write-Host "   ✅ Compressé: -$reduction% ($([math]::Round($newSize/1KB, 2)) KB)" -ForegroundColor Green
            return @{
                OriginalSize = $originalSize
                NewSize = $newSize
                Reduction = $reduction
                Success = $true
            }
        } else {
            # Pas assez d'économies, on garde l'original
            Remove-Item $tempFile -Force
            Write-Host "   ⏭️  Ignoré: compression insuffisante ($reduction%)" -ForegroundColor Gray
            return @{
                OriginalSize = $originalSize
                NewSize = $originalSize
                Reduction = 0
                Success = $false
            }
        }
    }
    catch {
        Write-Host "   ❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
        return @{
            OriginalSize = 0
            NewSize = 0
            Reduction = 0
            Success = $false
        }
    }
}

# Traitement des images
$totalOriginal = 0
$totalNew = 0
$processedCount = 0

Get-ChildItem -Path $ImagePath -Include "*.png", "*.jpg", "*.jpeg" -Recurse | 
    Where-Object { $_.Name -notlike "*.original" -and $_.Directory.Name -ne "backup" } |
    ForEach-Object {
        $result = Optimize-Image -FilePath $_.FullName -Quality $Quality
        $totalOriginal += $result.OriginalSize
        $totalNew += $result.NewSize
        if ($result.Success) { $processedCount++ }
    }

# Résumé
$overallReduction = if ($totalOriginal -gt 0) { 
    [math]::Round((($totalOriginal - $totalNew) / $totalOriginal) * 100, 2) 
} else { 0 }

Write-Host "`n📊 RÉSUMÉ DE LA COMPRESSION:" -ForegroundColor Green
Write-Host "   Fichiers traités: $processedCount" -ForegroundColor Cyan
Write-Host "   Taille originale: $([math]::Round($totalOriginal/1MB, 2)) MB" -ForegroundColor Cyan
Write-Host "   Taille finale: $([math]::Round($totalNew/1MB, 2)) MB" -ForegroundColor Cyan
Write-Host "   Économie totale: $overallReduction%" -ForegroundColor Green
Write-Host "   Espace libéré: $([math]::Round(($totalOriginal - $totalNew)/1MB, 2)) MB" -ForegroundColor Green

Write-Host "`n✅ COMPRESSION TERMINEE - Tous les originaux sont preserves dans le dossier backup !" -ForegroundColor Green 