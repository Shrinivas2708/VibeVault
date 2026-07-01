# VibeVault Architecture

> **Living document.** Update this file whenever architecture, APIs, folder structure, or infrastructure changes.

## Overview

VibeVault is a self-hosted, multi-user music and music-video platform for iOS and Android. Users authenticate against a shared VPS deployment, search across multiple providers through a unified interface, stream and download content to their devices, and manage favorites, history, and playlists.

The system is designed as a **Turborepo monorepo** with **Bun workspaces**, clear package boundaries, and a **provider adapter architecture** that hides implementation runtime (Node, Python, etc.) from the application layer.

---

## Goals

| Priority | Goal |
|----------|------|
| Primary | Unified search across providers — the product identity |
| Primary | Premium, Spotify-grade mobile UX |
| Primary | Architecture that scales to 100k+ LOC without rewrites |
| Secondary | Self-hosted infrastructure with no dependency on public provider instances |
| Secondary | Quality over speed — correct foundations first |

---

## High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Mobile App (Expo)                           │
│  Expo Router · NativeWind · TanStack Query · Zustand            │
│  react-native-track-player · MMKV · FlashList                   │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS / JSON API
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Node API (apps/api)                         │
│  Auth · Library · Search orchestration · Stream resolution      │
│  Provider Registry · Validation · Logging · Feature flags       │
└──────┬──────────────────┬──────────────────┬────────────────────┘
       │                  │                  │
       ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────────┐
│  MongoDB     │  │  Extractor   │  │  JioSaavn API    │
│              │  │  (Python +   │  │  (self-hosted)   │
│  Users       │  │   yt-dlp)    │  │                  │
│  Library     │  │              │  │                  │
│  History     │  └──────────────┘  └──────────────────┘
│  Favorites   │
└──────────────┘
       │
       ▼ (future)
┌──────────────┐
│   Nginx      │  Reverse proxy, TLS termination
└──────────────┘
```

---

## Repository Structure

```
vibevault/
├── apps/
│   ├── mobile/                 # Expo app (iOS + Android)
│   └── api/                    # Node/TypeScript HTTP API
├── services/
│   ├── extractor/              # Python + yt-dlp extraction service
│   └── jiosaavn/               # Self-hosted jiosaavn-api container
├── packages/
│   ├── ui/                     # Shared design tokens, primitives, themes
│   ├── types/                  # Shared TypeScript types + Zod schemas
│   ├── provider-core/          # Provider interfaces, registry, DTOs
│   ├── config/                 # Shared env parsing, constants, feature flags
│   └── utils/                  # Shared pure utilities
├── docs/
│   ├── MEMORY.md               # Session handoff
│   ├── DEVELOPMENT.md          # Local dev guide
│   ├── IMPLEMENTATION.md       # Code structure guide
│   ├── DEPLOYMENT.md           # Docker / VPS / EAS
│   ├── API.md                  # HTTP API reference
│   ├── INTERVIEW_PITCH.md      # Project narrative
│   ├── ARCHITECTURE.md         # This file
│   ├── DESIGN.md               # UI/UX source of truth
│   ├── DECISIONS.md            # Architecture decision log
│   └── ROADMAP.md              # Milestones and delivery plan
├── docker/
│   ├── api.Dockerfile
│   ├── extractor.Dockerfile
│   ├── jiosaavn.Dockerfile
│   └── nginx/                  # (later)
├── scripts/                    # Dev and deploy scripts
├── docker-compose.yml
├── turbo.json
├── package.json                # Workspace root
└── bun.lock
```

### Package Dependency Rules

```
apps/mobile  →  packages/ui, packages/types, packages/config
apps/api     →  packages/types, packages/provider-core, packages/config/server, packages/utils
services/*   →  No imports from apps/* (communicate via HTTP only)
packages/*   →  Acyclic; lower layers never import from apps
```

---

## Technology Stack

### Mobile (`apps/mobile`)

| Concern | Choice |
|---------|--------|
| Framework | Expo SDK (latest stable) |
| Builds | EAS Development Builds |
| Routing | Expo Router |
| Styling | NativeWind (Tailwind CSS) |
| Language | TypeScript |
| Server state | TanStack Query |
| Client state | Zustand |
| Forms | React Hook Form + Zod |
| Animation | React Native Reanimated + Gesture Handler |
| Lists | FlashList |
| Images | Expo Image |
| Blur | Expo Blur |
| Haptics | Expo Haptics |
| Local storage | MMKV |
| Playback | react-native-track-player (not expo-av) |

### API (`apps/api`)

| Concern | Choice |
|---------|--------|
| Runtime | Node.js + TypeScript |
| Package manager | Bun |
| Database | MongoDB |
| Validation | Zod (shared schemas from `@vibevault/types`) |
| Auth | JWT (access + refresh tokens) |
| Logging | Structured JSON logging (pino or equivalent) |
| Feature flags | `@vibevault/config` — env + DB-backed flags |

### Services

| Service | Runtime | Responsibility |
|---------|---------|----------------|
| `extractor` | Python | yt-dlp stream URL extraction, download metadata, format resolution |
| `jiosaavn` | Node (upstream image) | Self-hosted [jiosaavn-api](https://github.com/sumitkolhe/jiosaavn-api) |

### Infrastructure

| Component | Choice |
|-----------|--------|
| Orchestration (dev + prod) | Docker Compose |
| Monorepo | Turborepo + Bun workspaces |
| Reverse proxy | Nginx (`docker/nginx/`) |
| Hosting | VPS |

---

## Provider Architecture

### Principle

**The application never knows or cares which runtime implements a provider.** Only the adapter contract matters. Adding a provider means implementing a new adapter and registering it — no changes to mobile, search UI, or player logic.

### Provider Registry

```
Provider Registry
    ├── Spotify Adapter      (Node → Python spotify service)
    ├── JioSaavn Adapter     (Node → jiosaavn-api service)
    ├── YouTube Adapter      (Node → Python extractor / yt-dlp)
    └── [Future] Apple Music Adapter
```

### Adapter Contract

Each provider adapter implements capabilities behind a shared interface defined in `packages/provider-core`:

```typescript
interface MusicProvider {
  readonly id: ProviderId;
  readonly displayName: string;
  readonly capabilities: ProviderCapabilities;

  search(query: SearchQuery): Promise<SearchResultPage>;
  getMetadata(ref: TrackRef): Promise<TrackMetadata>;
  resolveStream(ref: TrackRef, options?: StreamOptions): Promise<StreamManifest>;
  importPlaylist(url: string): Promise<ImportedPlaylist>;
  resolveDownload?(ref: TrackRef, options?: DownloadOptions): Promise<DownloadManifest>;
}
```

### Capability Flags

Not every provider supports every operation. Capabilities are declared explicitly:

```typescript
interface ProviderCapabilities {
  search: boolean;
  metadata: boolean;
  streaming: boolean;
  playlistImport: boolean;
  download: boolean;
  video: boolean;
}
```

The unified search layer queries only providers where `capabilities.search === true`.

### Provider IDs (initial)

| ID | Source | Runtime | Search | Stream | Playlist | Download |
|----|--------|---------|--------|--------|----------|----------|
| `youtube` | yt-dlp | Python (extractor) | ✓ | ✓ | ✓ | ✓ |
| `spotify` | SpotifyScraper | Python (spotify service) | ✓ | ✗* | ✓ | ✗ |
| `jiosaavn` | jiosaavn-api | Node (service) | ✓ | ✓ | ✓ | ✓ |

\* Spotify provides metadata and playlist import; playback resolves via `POST /v1/tracks/match` (JioSaavn first, YouTube fallback) before `POST /v1/stream/resolve`.

### Unified Search Flow

```
Mobile: GET /v1/search?q=...
    │
    ▼
API: SearchOrchestrator
    ├── fan-out to registered providers (parallel, timeout per provider)
    ├── normalize results to SearchResult DTO
    ├── merge, deduplicate (fuzzy title+artist), rank
    └── return paginated unified response
```

### Normalized Domain Models

All provider responses are mapped to shared DTOs in `@vibevault/types`:

- `TrackRef` — stable reference: `{ providerId, externalId, url? }`
- `TrackMetadata` — title, artist, album, artwork, duration, isVideo
- `SearchResult` — `TrackMetadata` + `providerId` + relevance score
- `StreamManifest` — playback URL(s), expiry, format info
- `DownloadManifest` — download URL, filename, format, size estimate
- `ImportedPlaylist` — name, description, tracks[]

**No provider-specific fields leak past the adapter layer.**

---

## Streaming Architecture

### Decision: Direct Client Streaming (Option A)

The API extracts fresh stream URLs and returns them to the mobile client. The client streams **directly** from the source CDN — the VPS does **not** proxy every byte.

### StreamManifest Contract

Designed so a future proxy layer can be introduced **without changing the mobile API**:

```typescript
interface StreamManifest {
  trackRef: TrackRef;
  deliveryMode: 'direct' | 'proxied';   // 'direct' today; 'proxied' when needed
  url: string;                           // Client always plays this URL
  expiresAt: string;                     // ISO 8601 — client must re-resolve after expiry
  mimeType?: string;
  bitrate?: number;
  isVideo: boolean;
  headers?: Record<string, string>;    // Optional per-provider headers for direct mode
}
```

When `deliveryMode` switches to `proxied`, the API returns a VibeVault-hosted URL in `url` — the mobile player code path stays identical.

### Stream Lifecycle

1. Client requests `POST /v1/stream/resolve` with `TrackRef`
2. API delegates to the correct provider adapter
3. Adapter calls extractor (Python) or provider service as needed
4. API returns `StreamManifest` with short-lived URL
5. Client plays via `react-native-track-player`
6. On expiry or playback error, client re-resolves automatically

---

## Download & Offline Architecture

### Decision: Device-Only Storage

Downloaded media files live **on the device**. The server orchestrates extraction and provides download URLs; it does not persist user media files long-term.

### Download Flow

```
Mobile: POST /v1/downloads/resolve { trackRef }
    │
    ▼
API → Provider Adapter → Extractor
    │
    ▼
Returns DownloadManifest (URL, format, filename)
    │
    ▼
Mobile: downloads file to app sandbox (MMKV for index, filesystem for audio)
    │
    ▼
MMKV index: { localId, trackRef, filePath, downloadedAt, artworkPath? }
```

### Offline Playback

- `react-native-track-player` plays local `file://` URIs
- Library screen reads from local index + server metadata cache
- Server favorites/history sync independently of file presence

---

## Authentication & Users

### Model

Individual accounts on a shared self-hosted server (friends/household). Each user has:

- Private library metadata (favorites, history, playlists)
- Device-local downloads (not synced across devices by default)
- JWT-based session

### Auth Flow

```
POST /v1/auth/register
POST /v1/auth/login        → { accessToken, refreshToken, user }
POST /v1/auth/refresh
POST /v1/auth/logout
GET  /v1/auth/me
```

Tokens stored in MMKV (mobile). Refresh token rotation enforced server-side.

---

## API Design Standards

### Versioning

All routes prefixed with `/v1/`.

### Response Envelope

```typescript
// Success
{ "data": T, "meta"?: { page, total, ... } }

// Error
{ "error": { "code": string, "message": string, "details"?: unknown } }
```

### Validation

- Request bodies validated with Zod schemas from `@vibevault/types`
- Invalid requests return `400` with structured error details
- All API handlers return typed responses

### Core Endpoints

| Method | Path | Status | Description |
|--------|------|--------|-------------|
| GET | `/health` | ✅ | API health check |
| GET | `/health/deps` | ✅ | Dependency health |
| POST | `/v1/auth/register` | ✅ | Create account |
| POST | `/v1/auth/login` | ✅ | Login |
| POST | `/v1/auth/refresh` | ✅ | Rotate tokens |
| POST | `/v1/auth/logout` | ✅ | Revoke refresh session |
| GET | `/v1/auth/me` | ✅ | Current user (Bearer) |
| GET | `/v1/search` | ✅ | Unified cross-provider search (auth) |
| GET | `/v1/tracks/:providerId/:externalId` | ✅ | Track metadata |
| POST | `/v1/stream/resolve` | ✅ | Resolve playback URL |
| POST | `/v1/downloads/resolve` | ✅ | Resolve download URL |
| POST | `/v1/playlists/import` | planned | Import playlist from URL |
| GET | `/v1/library/favorites` | planned | User favorites |
| POST | `/v1/library/favorites` | planned | Add favorite |
| DELETE | `/v1/library/favorites/:id` | planned | Remove favorite |
| GET | `/v1/library/history` | planned | Playback history |
| POST | `/v1/library/history` | planned | Record play event |

---

## Engineering Standards

### Configuration

- All environment variables parsed in `@vibevault/config`
- `.env.example` committed; `.env` gitignored
- No hardcoded URLs, secrets, or feature toggles in application code

### Feature Flags

Defined in `@vibevault/config`:

```typescript
interface FeatureFlags {
  enableVideoPlayback: boolean;
  enableSpotifyImport: boolean;
  enableProxiedStreaming: boolean;  // future
  // ...
}
```

### Logging

- Structured JSON logs on API and services
- Correlation ID propagated via `X-Request-Id` header
- Log levels: `debug`, `info`, `warn`, `error`

### Error Handling

- Domain errors as typed error classes with stable `code` strings
- Provider failures isolated — one provider down does not fail entire search
- Client receives user-friendly messages; internals logged server-side

### Naming Conventions

| Context | Convention | Example |
|---------|------------|---------|
| Files (TS) | kebab-case | `stream-resolver.ts` |
| React components | PascalCase | `TrackCard.tsx` |
| Functions | camelCase | `resolveStream` |
| Types/Interfaces | PascalCase | `StreamManifest` |
| Constants | SCREAMING_SNAKE | `MAX_SEARCH_RESULTS` |
| API routes | kebab-case | `/v1/stream/resolve` |
| MongoDB collections | camelCase plural | `users`, `playHistory` |
| Env vars | SCREAMING_SNAKE | `MONGODB_URI` |

---

## Docker Compose Services

```yaml
services:
  api:          # Node API — host port 3000
  extractor:    # Python yt-dlp — port 8001 (internal only)
  jiosaavn:     # jiosaavn-api — port 3000 (internal only, upstream default)
  mongodb:      # MongoDB — port 27017
  # nginx:      # (later) — port 80/443
```

Internal services (`extractor`, `jiosaavn`) are not exposed to the host. Only `api` (and later `nginx`) faces the internet. The API reaches JioSaavn at `http://jiosaavn:3000` inside the Docker network.

---

## Mobile Navigation Structure (planned)

```
(tabs)
├── Home
├── Search          ← unified search (primary)
├── Library
│   ├── Favorites
│   ├── Downloads
│   └── History
└── Settings

(overlays)
├── Player          ← full-screen now playing
├── Queue
└── Playlist Import
```

---

## Security Notes

- VPS deployment is for **private use among known users** — not a public commercial service
- Scraping-based providers carry ToS and legal risk; document in `DECISIONS.md`
- Rate limiting on auth and search endpoints
- Input sanitization on all URL imports (playlist paste)
- HTTPS required in production (via Nginx + TLS)

---

## Known Limitations & Future Work

| Item | Status |
|------|--------|
| Nginx reverse proxy + TLS | ✅ `docker-compose.prod.yml` + `docker/nginx/` |
| Proxied streaming fallback | Architecture ready; not implemented |
| Cross-device download sync | Out of scope — device-local only |
| Web client | Out of scope for MVP |
| Apple Music provider | Future adapter |
| OTA updates via EAS | Enabled once mobile app is on EAS |

---

## Document History

| Date | Change |
|------|--------|
| 2025-06-25 | Initial architecture document — all core decisions locked |
| 2025-06-25 | M1 complete — monorepo structure, Docker Compose, Hono API, extractor scaffold |
| 2025-06-25 | M5 complete — unified search orchestration, media resolve routes |
