$ErrorActionPreference = "Stop"
$baseUrl = if ($env:API_URL) { $env:API_URL } else { "http://localhost:3000" }

Write-Host "VibeVault library (favorites + history) test" -ForegroundColor Cyan
Write-Host "API: $baseUrl"

$registerBody = @{
  email = "library-test@vibevault.local"
  password = "password123"
  displayName = "Library Tester"
} | ConvertTo-Json

try {
  $auth = Invoke-RestMethod -Method Post -Uri "$baseUrl/v1/auth/register" -ContentType "application/json" -Body $registerBody
} catch {
  $loginBody = @{
    email = "library-test@vibevault.local"
    password = "password123"
  } | ConvertTo-Json
  $auth = Invoke-RestMethod -Method Post -Uri "$baseUrl/v1/auth/login" -ContentType "application/json" -Body $loginBody
}

$token = $auth.data.tokens.accessToken
$headers = @{ Authorization = "Bearer $token" }

$favorites = Invoke-RestMethod -Method Get -Uri "$baseUrl/v1/library/favorites" -Headers $headers
Write-Host "Favorites: $($favorites.data.Count)" -ForegroundColor Green

$track = @{
  ref = @{
    providerId = "youtube"
    externalId = "dQw4w9WgXcQ"
    url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  }
  title = "Never Gonna Give You Up"
  artists = @(@{ name = "Rick Astley" })
  durationMs = 212000
  isVideo = $false
} | ConvertTo-Json -Depth 5

$added = Invoke-RestMethod -Method Post -Uri "$baseUrl/v1/library/favorites" -ContentType "application/json" -Headers $headers -Body (@{ track = ($track | ConvertFrom-Json) } | ConvertTo-Json -Depth 5)
Write-Host "Added favorite: $($added.data.track.title)" -ForegroundColor Green

$favorites = Invoke-RestMethod -Method Get -Uri "$baseUrl/v1/library/favorites" -Headers $headers
Write-Host "Favorites after add: $($favorites.data.Count)" -ForegroundColor Green

$historyBody = @{
  track = ($track | ConvertFrom-Json)
  durationPlayedMs = 30000
} | ConvertTo-Json -Depth 5

$entry = Invoke-RestMethod -Method Post -Uri "$baseUrl/v1/library/history" -ContentType "application/json" -Headers $headers -Body $historyBody
Write-Host "Recorded history: $($entry.data.track.title)" -ForegroundColor Green

$history = Invoke-RestMethod -Method Get -Uri "$baseUrl/v1/library/history?limit=10" -Headers $headers
Write-Host "History entries: $($history.data.Count)" -ForegroundColor Green

$removed = Invoke-RestMethod -Method Delete -Uri "$baseUrl/v1/library/favorites/youtube/dQw4w9WgXcQ" -Headers $headers
Write-Host "Removed favorite: $($removed.data.success)" -ForegroundColor Green
