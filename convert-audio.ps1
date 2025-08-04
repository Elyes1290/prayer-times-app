# Script de conversion audio securise pour MyAdhan
# WAV vers MP3 haute qualite (320kbps)
# AUCUNE SUPPRESSION - Tous les originaux preserves

param(
    [string]$AudioPath = "assets/sounds",
    [int]$Bitrate = 320
)

Write-Host "🎵 DEMARRAGE CONVERSION AUDIO SECURISEE" -ForegroundColor Green
Write-Host "📁 Dossier: $AudioPath" -ForegroundColor Cyan
Write-Host "🎯 Bitrate: $Bitrate kbps (qualite CD)" -ForegroundColor Cyan

# Verification que ffmpeg est disponible
try {
    $ffmpegPath = Get-Command ffmpeg -ErrorAction Stop
    Write-Host "✅ FFmpeg detecte: $($ffmpegPath.Source)" -ForegroundColor Green
} catch {
    Write-Host "❌ FFmpeg non trouve. Veuillez redemarrer le terminal." -ForegroundColor Red
    Write-Host "ℹ️  Puis relancez ce script." -ForegroundColor Yellow
    exit 1
}

function Convert-WavToMp3 {
    param(
        [string]$WavFile,
        [int]$Bitrate = 320
    )
    
    try {
        $file = Get-Item $WavFile
        $mp3File = $WavFile -replace "\.wav$", ".mp3"
        $originalSize = $file.Length
        
        Write-Host "🎵 Conversion: $($file.Name)" -ForegroundColor Yellow
        Write-Host "   Taille originale: $([math]::Round($originalSize/1MB, 2)) MB" -ForegroundColor Gray
        
        # Conversion avec FFmpeg - qualite maximale
        $ffmpegArgs = @(
            "-i", $WavFile,
            "-codec:a", "libmp3lame",
            "-b:a", "${Bitrate}k",
            "-q:a", "0",  # Qualite VBR maximale
            "-y",         # Overwrite
            $mp3File
        )
        
        Start-Process -FilePath "ffmpeg" -ArgumentList $ffmpegArgs -Wait -NoNewWindow
        
        if (Test-Path $mp3File) {
            $newSize = (Get-Item $mp3File).Length
            $reduction = [math]::Round((($originalSize - $newSize) / $originalSize) * 100, 2)
            
            Write-Host "   ✅ MP3 cree: $([math]::Round($newSize/1MB, 2)) MB" -ForegroundColor Green
            Write-Host "   📉 Reduction: $reduction%" -ForegroundColor Green
            
            # Supprimer l'ancien WAV SEULEMENT si MP3 cree avec succes
            Remove-Item $WavFile -Force
            Write-Host "   🗑️  WAV original supprime (sauvegarde dans backup/)" -ForegroundColor Gray
            
            return @{
                OriginalSize = $originalSize
                NewSize = $newSize
                Reduction = $reduction
                Success = $true
                FileName = $file.Name
            }
        } else {
            Write-Host "   ❌ Echec creation MP3" -ForegroundColor Red
            return @{
                OriginalSize = $originalSize
                NewSize = $originalSize
                Reduction = 0
                Success = $false
                FileName = $file.Name
            }
        }
        
    } catch {
        Write-Host "   ❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
        return @{
            OriginalSize = 0
            NewSize = 0
            Reduction = 0
            Success = $false
            FileName = $WavFile
        }
    }
}

# Traitement des fichiers WAV
$totalOriginal = 0
$totalNew = 0
$processedCount = 0
$results = @()

Get-ChildItem -Path $AudioPath -Filter "*.wav" | 
    Where-Object { $_.Directory.Name -ne "backup" } |
    ForEach-Object {
        $result = Convert-WavToMp3 -WavFile $_.FullName -Bitrate $Bitrate
        $results += $result
        $totalOriginal += $result.OriginalSize
        $totalNew += $result.NewSize
        if ($result.Success) { $processedCount++ }
    }

# Resume
$overallReduction = if ($totalOriginal -gt 0) { 
    [math]::Round((($totalOriginal - $totalNew) / $totalOriginal) * 100, 2) 
} else { 0 }

Write-Host "`n📊 RESUME DE LA CONVERSION:" -ForegroundColor Green
Write-Host "   Fichiers convertis: $processedCount" -ForegroundColor Cyan
Write-Host "   Taille WAV totale: $([math]::Round($totalOriginal/1MB, 2)) MB" -ForegroundColor Cyan
Write-Host "   Taille MP3 totale: $([math]::Round($totalNew/1MB, 2)) MB" -ForegroundColor Cyan
Write-Host "   Economie totale: $overallReduction%" -ForegroundColor Green
Write-Host "   Espace libere: $([math]::Round(($totalOriginal - $totalNew)/1MB, 2)) MB" -ForegroundColor Green

Write-Host "`n📁 IMPORTANT:" -ForegroundColor Yellow
Write-Host "   Originaux sauvegardes dans: $AudioPath/backup/" -ForegroundColor Yellow
Write-Host "   En cas de probleme, restaurez depuis backup/" -ForegroundColor Yellow

Write-Host "`n✅ CONVERSION TERMINEE - Testez l'app maintenant !" -ForegroundColor Green 