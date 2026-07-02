# Re-bundle release APK with a fresh API URL (no full prebuild).
# Use when you changed .env / API URL and Android Studio didn't pick it up.

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

$env:EXPO_PUBLIC_API_URL = "https://api.onetune.shribuilds.in/"
$env:EXPO_NO_METRO_WORKSPACE_ROOT = "1"

Write-Host "API URL: $env:EXPO_PUBLIC_API_URL"
Write-Host "Clearing old JS bundle cache..."

$cachePaths = @(
  "android\app\build",
  ".expo",
  "node_modules\.cache"
)

foreach ($path in $cachePaths) {
  if (Test-Path $path) {
    Remove-Item -Recurse -Force $path
    Write-Host "  removed $path"
  }
}

Write-Host "Rebuilding release APK..."
Set-Location android
.\gradlew.bat --stop
.\gradlew.bat :app:createBundleReleaseJsAndAssets --rerun-tasks
.\gradlew.bat assembleRelease -x lint -x test
Set-Location ..

$apk = "android\app\build\outputs\apk\release\app-release.apk"
if (Test-Path $apk) {
  Write-Host ""
  Write-Host "Done. Install this APK:"
  Write-Host (Resolve-Path $apk)
} else {
  Write-Error "APK not found at $apk"
}
