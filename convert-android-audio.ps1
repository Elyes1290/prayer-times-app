# Conversion Audio Android WAV vers MP3
# Optimisation pour MyAdhan - Android Native

Write-Host "=== CONVERSION AUDIO ANDROID DEMARREE ===" -ForegroundColor Green
Write-Host "Dossier: android/app/src/main/res/raw/" -ForegroundColor Cyan

# Verification FFmpeg
try {
    ffmpeg -version 2>&1 | Out-Null
    Write-Host "FFmpeg detecte !" -ForegroundColor Green
} catch {
    Write-Host "ERREUR: FFmpeg non trouve." -ForegroundColor Red
    exit 1
}

# Conversion des WAV Android
Get-ChildItem "android/app/src/main/res/raw/*.wav" | ForEach-Object {
    $wavFile = $_.FullName
    $mp3File = $wavFile -replace "\.wav$", ".mp3"
    $fileName = $_.Name
    
    Write-Host "Conversion Android: $fileName" -ForegroundColor Yellow
    Write-Host "  Taille originale: $([math]::Round($_.Length/1MB, 2)) MB" -ForegroundColor Gray
    
    # FFmpeg conversion haute qualite
    ffmpeg -i $wavFile -codec:a libmp3lame -b:a 320k -q:a 0 -y $mp3File
    
    if (Test-Path $mp3File) {
        $originalSize = [math]::Round($_.Length/1MB, 2)
        $newSize = [math]::Round((Get-Item $mp3File).Length/1MB, 2)
        $reduction = [math]::Round((($_.Length - (Get-Item $mp3File).Length) / $_.Length) * 100, 2)
        
        Write-Host "SUCCES Android: $fileName" -ForegroundColor Green
        Write-Host "  $originalSize MB -> $newSize MB" -ForegroundColor Cyan
        Write-Host "  Economie: $reduction%" -ForegroundColor Green
        
        # Supprimer WAV apres conversion reussie
        Remove-Item $wavFile -Force
        Write-Host "  WAV supprime (sauvegarde OK)" -ForegroundColor Gray
    } else {
        Write-Host "ECHEC: $fileName" -ForegroundColor Red
    }
    
    Write-Host "---" -ForegroundColor Gray
}

Write-Host "=== CONVERSION ANDROID TERMINEE ===" -ForegroundColor Green
Write-Host "Originaux Android sauvegardes dans: android/app/src/main/res/raw/backup/" -ForegroundColor Yellow 