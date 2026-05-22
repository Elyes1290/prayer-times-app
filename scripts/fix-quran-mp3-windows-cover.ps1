# Réinjecte la pochette pour le Lecteur Windows (sans ré-encoder l'audio).
# À utiliser si fix-quran-mp3.ps1 a déjà tourné : l'app MyAdhan affiche l'image,
# mais l'Explorateur / Lecteur Windows ne la voit plus (PNG vs ID3 MJPEG).
#
# Usage:
#   cd C:\prayer-times-app
#   .\scripts\fix-quran-mp3-windows-cover.ps1
#   .\scripts\fix-quran-mp3-windows-cover.ps1 -Backup

param(
    [string]$Folder = ".\mp3-fix",
    [switch]$Backup
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
    Write-Error "ffmpeg introuvable."
    exit 1
}

$Folder = (Resolve-Path -LiteralPath $Folder).Path
Write-Host "Dossier: $Folder"

$files = Get-ChildItem -LiteralPath $Folder -File -Filter "*.mp3" |
    Where-Object { $_.BaseName -match '^\d{1,3}$' } |
    ForEach-Object {
        $n = [int]$_.BaseName
        if ($n -ge 1 -and $n -le 114) {
            [PSCustomObject]@{ Number = $n; Name = ("{0:D3}.mp3" -f $n); Path = $_.FullName }
        }
    } |
    Sort-Object Number

if ($files.Count -eq 0) {
    Write-Error "Aucun 001.mp3 … 114.mp3 dans $Folder"
    exit 1
}

if ($Backup) {
    New-Item -ItemType Directory -Force -Path (Join-Path $Folder "backup-windows-cover") | Out-Null
}

$ok = 0
$skip = 0
$fail = 0

foreach ($f in $files) {
    $src = $f.Path
    $tempPath = Join-Path $Folder ("{0}.wincover.tmp.mp3" -f $f.Number)

    Write-Host ""
    Write-Host ('[{0}/114] {1} ...' -f $f.Number, $f.Name) -ForegroundColor Cyan

    $hasCover = & ffprobe -hide_banner -loglevel error -select_streams v `
        -show_entries stream=index -of csv=p=0 $src 2>$null
    if (-not $hasCover) {
        Write-Host '  SKIP (pas de flux pochette dans le fichier)' -ForegroundColor Yellow
        $skip++
        continue
    }

    if (Test-Path -LiteralPath $tempPath) { Remove-Item -LiteralPath $tempPath -Force }

    & ffmpeg -hide_banner -loglevel error -y `
        -i $src `
        -map 0:a:0 `
        -map 0:v:0? `
        -c:a copy `
        -write_xing 1 `
        -c:v mjpeg `
        -disposition:v:0 attached_pic `
        -id3v2_version 3 `
        -map_metadata 0 `
        $tempPath

    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $tempPath)) {
        Write-Host '  ECHEC' -ForegroundColor Red
        $fail++
        continue
    }

    if ($Backup) {
        Copy-Item -LiteralPath $src -Destination (Join-Path $Folder "backup-windows-cover\$($f.Name)") -Force
    }

    Remove-Item -LiteralPath $src -Force
    Rename-Item -LiteralPath $tempPath -NewName $f.Name -Force
    Write-Host '  OK (pochette ID3 Windows)' -ForegroundColor Green
    $ok++
}

Write-Host ""
Write-Host ('Termine: {0} OK, {1} skip, {2} echec(s).' -f $ok, $skip, $fail) -ForegroundColor Green
