# Nettoyage Android fiable (évite les erreurs CMake/codegen de gradlew clean seul)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Android = Join-Path $Root "android"

Write-Host "🧹 Nettoyage Android (prayer-times-app)..."

$removeDirs = @(
  (Join-Path $Android "app\.cxx"),
  (Join-Path $Android "app\build"),
  (Join-Path $Android "build"),
  (Join-Path $Android ".gradle")
)

foreach ($dir in $removeDirs) {
  if (Test-Path $dir) {
    Remove-Item -Recurse -Force $dir
    Write-Host "  Supprimé: $dir"
  }
}

Push-Location $Android
try {
  & .\gradlew.bat clean `
    -x :app:externalNativeBuildCleanRelease `
    -x :app:externalNativeBuildCleanDebug
  if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️ gradlew clean a signalé une erreur (souvent bénin après suppression manuelle)."
  } else {
    Write-Host "✅ gradlew clean terminé"
  }
} finally {
  Pop-Location
}

Write-Host ""
Write-Host "Prochaines étapes suggérées:"
Write-Host "  npm run sync:android-locales"
Write-Host "  npm run android   (ou: cd android; .\gradlew.bat assembleRelease)"
