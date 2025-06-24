# Conversion WAV vers MP3 - MyAdhan App
# Securise avec sauvegardes

Write-Host "=== CONVERSION AUDIO DEMARREE ===" -ForegroundColor Green

# Verification FFmpeg
try {
    ffmpeg -version 2>&1 | Out-Null
    Write-Host "FFmpeg detecte !" -ForegroundColor Green
} catch {
    Write-Host "ERREUR: FFmpeg non trouve. Redemarrez le terminal." -ForegroundColor Red
    exit 1
}

# Conversion de chaque fichier WAV
Get-ChildItem "assets/sounds/*.wav" | ForEach-Object {
    $wavFile = $_.FullName
    $mp3File = $wavFile -replace "\.wav$", ".mp3"
    $fileName = $_.Name
    
    Write-Host "Conversion: $fileName" -ForegroundColor Yellow
    
    # Commande FFmpeg simple et efficace
    ffmpeg -i $wavFile -codec:a libmp3lame -b:a 320k -q:a 0 -y $mp3File
    
    if (Test-Path $mp3File) {
        $originalSize = [math]::Round($_.Length/1MB, 2)
        $newSize = [math]::Round((Get-Item $mp3File).Length/1MB, 2)
        $reduction = [math]::Round((($_.Length - (Get-Item $mp3File).Length) / $_.Length) * 100, 2)
        
        Write-Host "SUCCES: $fileName" -ForegroundColor Green
        Write-Host "  Original: $originalSize MB -> MP3: $newSize MB" -ForegroundColor Gray
        Write-Host "  Reduction: $reduction%" -ForegroundColor Cyan
        
        # Supprimer WAV seulement si MP3 cree avec succes
        Remove-Item $wavFile -Force
        Write-Host "  WAV supprime (sauvegarde dans backup/)" -ForegroundColor Gray
    } else {
        Write-Host "ECHEC: $fileName" -ForegroundColor Red
    }
    
    Write-Host "---" -ForegroundColor Gray
}

Write-Host "=== CONVERSION TERMINEE ===" -ForegroundColor Green
Write-Host "Originaux sauvegardes dans: assets/sounds/backup/" -ForegroundColor Yellow
Write-Host "Testez maintenant l'application !" -ForegroundColor Cyan 