# Ré-encode les MP3 Coran (Xing/seek Android) — garde 001.mp3 … 114.mp3
# Garde la pochette ID3 si elle est valide ; repli « audio seul » seulement si ffmpeg échoue.
#
# Workflow:
#   1. Mettre 001.mp3 … 114.mp3 dans mp3-fix\
#   2. Lancer ce script
#   3. Re-uploader mp3-fix\ vers le dossier récitateur sur le serveur
#
# Usage:
#   cd C:\prayer-times-app
#   .\scripts\fix-quran-mp3.ps1
#
# Avec backup des originaux dans mp3-fix\backup\ :
#   .\scripts\fix-quran-mp3.ps1 -Backup

param(
    [Parameter(Mandatory = $false)]
    [string]$Folder = ".\mp3-fix",

    [switch]$Backup
)

$ErrorActionPreference = "Stop"

function Test-Command($name) {
    $null -ne (Get-Command $name -ErrorAction SilentlyContinue)
}

if (-not (Test-Command "ffmpeg")) {
    Write-Error "ffmpeg introuvable. Installe FFmpeg et ajoute-le au PATH."
    exit 1
}

$Folder = (Resolve-Path -LiteralPath $Folder).Path
Write-Host "Dossier: $Folder"

$files = Get-ChildItem -LiteralPath $Folder -File -Filter "*.mp3" |
    Where-Object { $_.BaseName -match '^\d{1,3}$' } |
    ForEach-Object {
        $n = [int]$_.BaseName
        if ($n -ge 1 -and $n -le 114) {
            [PSCustomObject]@{
                Number = $n
                Name   = ("{0:D3}.mp3" -f $n)
                Path   = $_.FullName
            }
        }
    } |
    Sort-Object Number

if ($files.Count -eq 0) {
    Write-Error "Aucun fichier 001.mp3 … 114.mp3 dans $Folder"
    exit 1
}

if ($Backup) {
    $backupDir = Join-Path $Folder "backup"
    New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
}

$ok = 0
$okArt = 0
$okNoArt = 0
$fail = 0

function Test-Mp3HasAttachedCover {
    param([string]$Path)
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = "SilentlyContinue"
    $codec = & ffprobe -hide_banner -v error -select_streams v:0 `
        -show_entries stream=codec_name -of default=nw=1:nk=1 `
        -LiteralPath $Path 2>&1 | Select-Object -First 1
    $ErrorActionPreference = $prevEap
    return ($codec -match "^(mjpeg|png|jpeg|jpg)$")
}

function Invoke-QuranMp3Encode {
    param(
        [string]$SourcePath,
        [string]$OutputPath,
        [switch]$AudioOnly
    )
    $ffmpegArgs = @(
        "-hide_banner", "-loglevel", "error", "-y",
        "-i", $SourcePath
    )
    if ($AudioOnly) {
        $ffmpegArgs += @("-map", "0:a:0", "-map_metadata", "0")
        $ffmpegArgs += @(
            "-c:a", "libmp3lame", "-q:a", "2", "-write_xing", "1",
            $OutputPath
        )
    }
    else {
        # Audio + pochette : ID3 APIC en MJPEG pour Windows Media Player + Android
        $ffmpegArgs += @(
            "-map", "0:a:0",
            "-map", "0:v:0?",
            "-map_metadata", "0",
            "-c:a", "libmp3lame", "-q:a", "2", "-write_xing", "1",
            "-c:v", "mjpeg",
            "-disposition:v:0", "attached_pic",
            "-id3v2_version", "3",
            $OutputPath
        )
    }
    & ffmpeg @ffmpegArgs
    return $LASTEXITCODE
}

foreach ($f in $files) {
    $src = $f.Path
    $finalName = $f.Name
    $finalPath = Join-Path $Folder $finalName
    $tempPath = Join-Path $Folder ("{0}.encoding.tmp.mp3" -f $f.Number)

    Write-Host ""
    Write-Host "[$($f.Number)/114] $finalName ..." -ForegroundColor Cyan

    if (Test-Path -LiteralPath $tempPath) {
        Remove-Item -LiteralPath $tempPath -Force
    }

    # 1) Essai avec pochette ID3 (récitateurs dont la jaquette est saine)
    $mode = "avec pochette"
    $exitCode = Invoke-QuranMp3Encode -SourcePath $src -OutputPath $tempPath

    if ($exitCode -ne 0 -or -not (Test-Path -LiteralPath $tempPath)) {
        if (Test-Path -LiteralPath $tempPath) {
            Remove-Item -LiteralPath $tempPath -Force
        }
        # 2) Repli audio seul si pochette mjpeg corrompue (ex. certains téléchargements)
        $exitCode = Invoke-QuranMp3Encode -SourcePath $src -OutputPath $tempPath -AudioOnly
        $mode = "audio seul (pochette corrompue ignoree)"
    }

    if ($exitCode -ne 0 -or -not (Test-Path -LiteralPath $tempPath)) {
        Write-Host "  ECHEC ffmpeg" -ForegroundColor Red
        $fail++
        continue
    }

    if ($mode -like "avec pochette*" -and -not (Test-Mp3HasAttachedCover -Path $tempPath)) {
        $mode = "audio seul (pochette absente apres encodage)"
    }

    if ($Backup) {
        $backupPath = Join-Path (Join-Path $Folder "backup") $finalName
        Copy-Item -LiteralPath $src -Destination $backupPath -Force
        Write-Host "  Backup: backup\$finalName"
    }

    Remove-Item -LiteralPath $src -Force
    Rename-Item -LiteralPath $tempPath -NewName $finalName -Force

    $sizeMb = [math]::Round((Get-Item -LiteralPath $finalPath).Length / 1MB, 2)
    Write-Host ('  OK ({0} Mo) - {1}' -f $sizeMb, $mode) -ForegroundColor Green
    $ok++
    if ($mode -like "avec pochette*") { $okArt++ } else { $okNoArt++ }
}

Write-Host ""
$summaryColor = if ($fail -eq 0) { "Green" } else { "Yellow" }
Write-Host ('Termine: {0} OK ({1} avec pochette, {2} audio seul), {3} echec(s).' -f $ok, $okArt, $okNoArt, $fail) -ForegroundColor $summaryColor
Write-Host "Tu peux re-uploader tout le dossier sur le serveur (SFTP)."
