# VibeVault — API Reference

> HTTP API for the VibeVault backend. Base URL: `http://localhost:3000` (dev) or your VPS URL (prod).

**Version prefix:** `/v1`

---

## Response Format

### Success

```json
{
  "data": { },
  "meta": { }
}
```

`meta` is optional (pagination, diagnostics).

### Error

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": { }
  }
}
```

### Error codes

| Code | HTTP | Description |
|------|------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request body or query |
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `NOT_FOUND` | 404 | Route or resource not found |
| `CONFLICT` | 409 | Email already registered |
| `PROVIDER_ERROR` | 501/502 | Provider operation failed |
| `PROVIDER_UNAVAILABLE` | 503 | Provider timeout or down |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

### Headers

| Header | Description |
|--------|-------------|
| `Authorization` | `Bearer <accessToken>` for protected routes |
| `X-Request-Id` | Optional client request ID; echoed in response |

---

## Health

No authentication required.

### `GET /health`

```json
{
  "status": "ok",
  "service": "api",
  "timestamp": "2025-06-25T12:00:00.000Z"
}
```

### `GET /health/deps`

Checks extractor, jiosaavn, and spotify services.

```json
{
  "data": {
    "status": "ok",
    "service": "api",
    "dependencies": {
      "extractor": true,
      "jiosaavn": true,
      "spotify": true
    }
  }
}
```

Returns `503` if any dependency is unhealthy.

---

## Authentication

### `POST /v1/auth/register`

Create an account.

**Body:**

```json
{
  "email": "user@example.com",
  "password": "password123",
  "displayName": "Alex"
}
```

**Response `201`:**

```json
{
  "data": {
    "user": {
      "id": "...",
      "email": "user@example.com",
      "displayName": "Alex",
      "createdAt": "2025-06-25T12:00:00.000Z"
    },
    "tokens": {
      "accessToken": "...",
      "refreshToken": "...",
      "expiresIn": 900
    }
  }
}
```

### `POST /v1/auth/login`

Same body as register (without `displayName` requirement on schema — email + password only).

**Response `200`:** Same shape as register.

### `POST /v1/auth/refresh`

```json
{
  "refreshToken": "..."
}
```

Returns new access + refresh tokens (rotation).

### `POST /v1/auth/logout`

```json
{
  "refreshToken": "..."
}
```

Revokes refresh session. Idempotent.

### `GET /v1/auth/me`

**Auth required.**

```json
{
  "data": {
    "id": "...",
    "email": "user@example.com",
    "displayName": "Alex",
    "createdAt": "2025-06-25T12:00:00.000Z"
  }
}
```

---

## Music (Unified Search & Playback)

**All routes below require `Authorization: Bearer <accessToken>`.**

### `GET /v1/search`

Unified search across YouTube, JioSaavn, and Spotify.

**Query parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `q` | string | required | Search query (1–200 chars) |
| `page` | number | `1` | Page number |
| `limit` | number | `20` | Results per page (max 50) |

**Example:**

```
GET /v1/search?q=believer&page=1&limit=10
```

**Response:**

```json
{
  "data": {
    "results": [
      {
        "providerId": "jiosaavn",
        "title": "Believer",
        "artists": [{ "name": "Imagine Dragons" }],
        "artworkUrl": "https://...",
        "durationMs": 204000,
        "isVideo": false,
        "relevanceScore": 0.95,
        "ref": {
          "providerId": "jiosaavn",
          "externalId": "abc123",
          "url": "https://..."
        }
      }
    ],
    "meta": {
      "page": 1,
      "limit": 10,
      "total": 24,
      "hasMore": true
    },
    "providersQueried": ["youtube", "jiosaavn", "spotify"],
    "providersFailed": []
  }
}
```

Duplicate tracks (same title + artist) are deduplicated. Playable providers (JioSaavn, YouTube) are preferred over Spotify metadata-only results.

---

### `GET /v1/tracks/:providerId/:externalId`

Track metadata for a single provider.

**Path parameters:**

| Param | Values |
|-------|--------|
| `providerId` | `youtube`, `jiosaavn`, `spotify` |
| `externalId` | Provider-specific track ID |

**Example:**

```
GET /v1/tracks/jiosaavn/3IoDK8qI
```

---

### `POST /v1/stream/resolve`

Resolve a playable stream URL. Client streams **directly** from the returned URL.

**Body:**

```json
{
  "trackRef": {
    "providerId": "jiosaavn",
    "externalId": "3IoDK8qI",
    "url": "https://..."
  },
  "options": {
    "preferVideo": false,
    "quality": "high"
  }
}
```

**Response:**

```json
{
  "data": {
    "trackRef": { "providerId": "jiosaavn", "externalId": "3IoDK8qI" },
    "deliveryMode": "direct",
    "url": "https://...",
    "expiresAt": "2025-06-25T13:00:00.000Z",
    "isVideo": false
  }
}
```

**Notes:**

- Spotify returns `501` — metadata only, no stream URL
- Re-resolve when `expiresAt` passes or playback fails

---

### `POST /v1/downloads/resolve`

Resolve a download URL (file stored on device by mobile app — not on server).

**Body:**

```json
{
  "trackRef": {
    "providerId": "youtube",
    "externalId": "dQw4w9WgXcQ"
  },
  "options": {
    "format": "best",
    "quality": "high"
  }
}
```

**Response:**

```json
{
  "data": {
    "trackRef": { "providerId": "youtube", "externalId": "dQw4w9WgXcQ" },
    "url": "https://...",
    "filename": "Song_Title.m4a",
    "format": "m4a",
    "expiresAt": "2025-06-25T13:00:00.000Z"
  }
}
```

Spotify returns `501` — downloads not supported.

---

## Playlists (User Library)

All routes require authentication.

### `POST /v1/playlists/import`

Import a **public Spotify playlist** URL into the user's library.

**Body:**

```json
{
  "url": "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M"
}
```

**Response:** `201` with full `SavedPlaylist` (summary + `tracks[]`).

Re-importing the same URL updates tracks in place.

**Errors:**

- `400` — not a Spotify playlist URL
- `502/503` — Spotify scraper unavailable

---

### `GET /v1/playlists`

List imported playlists for the authenticated user (newest first).

**Response:**

```json
{
  "data": [
    {
      "id": "...",
      "userId": "...",
      "name": "Today's Top Hits",
      "trackCount": 50,
      "sourceUrl": "https://open.spotify.com/playlist/...",
      "sourceProviderId": "spotify",
      "createdAt": "2025-06-25T12:00:00.000Z",
      "updatedAt": "2025-06-25T12:00:00.000Z"
    }
  ]
}
```

---

### `GET /v1/playlists/:playlistId`

Full playlist with `tracks[]` (`TrackMetadata` per track).

**Notes:**

- Tracks are Spotify metadata; playback uses stream resolve on the track's `ref` (typically fails for `spotify` — cross-provider matching is future work)
- User can only access their own playlists

---

## Library (Favorites & History)

All routes require authentication. Favorites and history are stored per user in MongoDB.

### `GET /v1/library/favorites`

List the user's favorited tracks (newest first).

**Response:**

```json
{
  "data": [
    {
      "id": "...",
      "userId": "...",
      "track": { "ref": { "providerId": "youtube", "externalId": "..." }, "title": "...", "artists": [{ "name": "..." }] },
      "createdAt": "2025-06-25T12:00:00.000Z"
    }
  ]
}
```

---

### `POST /v1/library/favorites`

Add a track to favorites. Idempotent per `providerId` + `externalId`.

**Body:**

```json
{
  "track": { "ref": { "providerId": "youtube", "externalId": "dQw4w9WgXcQ" }, "title": "...", "artists": [{ "name": "..." }] }
}
```

**Response:** `201` with `Favorite`.

---

### `DELETE /v1/library/favorites/:providerId/:externalId`

Remove a favorite. Returns `{ "success": true }`.

---

### `GET /v1/library/history?limit=50`

Recently played tracks (deduped by track, newest play first). `limit` max 100.

**Response:**

```json
{
  "data": [
    {
      "id": "...",
      "userId": "...",
      "track": { "ref": { "providerId": "jiosaavn", "externalId": "..." }, "title": "...", "artists": [{ "name": "..." }] },
      "playedAt": "2025-06-25T12:30:00.000Z",
      "durationPlayedMs": 45000
    }
  ]
}
```

---

### `POST /v1/library/history`

Record a play event (mobile calls this after successful playback start).

**Body:**

```json
{
  "track": { "ref": { "providerId": "youtube", "externalId": "..." }, "title": "...", "artists": [{ "name": "..." }] },
  "durationPlayedMs": 30000
}
```

**Response:** `201` with `HistoryEntry`.

---

## Internal Routes (Development Only)

Available when `NODE_ENV !== production`. **No authentication required.**

Use for testing individual providers in isolation.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/internal/providers` | List providers + capabilities |
| `GET` | `/v1/internal/providers/:id/search?query=&page=&limit=` | Single-provider search |
| `GET` | `/v1/internal/providers/:id/tracks/:externalId` | Single-provider metadata |
| `POST` | `/v1/internal/providers/:id/stream` | Stream resolve |
| `POST` | `/v1/internal/providers/:id/download` | Download resolve |
| `POST` | `/v1/internal/providers/:id/playlists/import` | Playlist import |

`:id` is `youtube`, `jiosaavn`, or `spotify`.

---

## Provider Capabilities

| Provider | Search | Metadata | Stream | Download | Playlist |
|----------|--------|----------|--------|----------|----------|
| `youtube` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `jiosaavn` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `spotify` | ✓ | ✓ | ✗ | ✗ | ✓ |

---

## Related Docs

| Doc | Purpose |
|-----|---------|
| [DEVELOPMENT.md](./DEVELOPMENT.md) | How to call the API locally |
| [IMPLEMENTATION.md](./IMPLEMENTATION.md) | How routes are implemented |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design |
