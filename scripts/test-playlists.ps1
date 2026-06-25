$ErrorActionPreference = "Stop"
$baseUrl = if ($env:API_URL) { $env:API_URL } else { "http://localhost:3000" }

Write-Host "VibeVault playlist import test" -ForegroundColor Cyan
Write-Host "API: $baseUrl"

$registerBody = @{
  email = "playlist-test@vibevault.local"
  password = "password123"
  displayName = "Playlist Tester"
} | ConvertTo-Json

try {
  $auth = Invoke-RestMethod -Method Post -Uri "$baseUrl/v1/auth/register" -ContentType "application/json" -Body $registerBody
} catch {
  $loginBody = @{
    email = "playlist-test@vibevault.local"
    password = "password123"
  } | ConvertTo-Json
  $auth = Invoke-RestMethod -Method Post -Uri "$baseUrl/v1/auth/login" -ContentType "application/json" -Body $loginBody
}

$token = $auth.data.tokens.accessToken
$headers = @{ Authorization = "Bearer $token" }

$list = Invoke-RestMethod -Method Get -Uri "$baseUrl/v1/playlists" -Headers $headers
Write-Host "Playlists: $($list.data.Count)" -ForegroundColor Green

if (-not $env:SPOTIFY_PLAYLIST_URL) {
  Write-Host "Set SPOTIFY_PLAYLIST_URL to test import (public Spotify playlist)." -ForegroundColor Yellow
  exit 0
}

$importBody = @{ url = $env:SPOTIFY_PLAYLIST_URL } | ConvertTo-Json
$imported = Invoke-RestMethod -Method Post -Uri "$baseUrl/v1/playlists/import" -ContentType "application/json" -Headers $headers -Body $importBody
Write-Host "Imported: $($imported.data.name) ($($imported.data.trackCount) tracks)" -ForegroundColor Green

$detail = Invoke-RestMethod -Method Get -Uri "$baseUrl/v1/playlists/$($imported.data.id)" -Headers $headers
Write-Host "Detail tracks: $($detail.data.tracks.Count)" -ForegroundColor Green
