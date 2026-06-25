# VibeVault — Session Memory

> **Read this first in every new session.** Living handoff document — update after every milestone.

**Last updated:** 2025-06-25 · **Current milestone:** M10 complete → **Next: M11 (Downloads & Offline)**

---

## What Is VibeVault?

Self-hosted, multi-provider music + music-video app for **iOS & Android**. Friends/household share a **VPS** with individual accounts. **Unified search** across providers is the product identity.

| Area | Decision |
|------|----------|
| Mobile | Expo 54, EAS dev builds, NativeWind, TanStack Query, Zustand, track-player (later) |
| Backend | Node/Bun API (Hono) + Python extractor (yt-dlp) + self-hosted JioSaavn API |
| Database | MongoDB |
| Monorepo | Turborepo + Bun workspaces |
| Streaming | **Option A** — direct client URLs; `StreamManifest.deliveryMode` allows future proxy |
| Downloads | Device-only; server orchestrates |
| Providers | Adapter pattern — SpotifyScraper, yt-dlp, JioSaavn (no official APIs) |
| Design | `docs/DESIGN.md` — Spotify-inspired dark UI, Inter + Plus Jakarta Sans |

---

## Repository Layout

```
apps/mobile/          Expo app
apps/api/             Hono API on Bun
services/extractor/   Python FastAPI + yt-dlp
services/jiosaavn/    Docker build from upstream repo
packages/
  types/              Zod schemas + inferred TypeScript types
  config/             Constants, feature flags, server env (./server export)
  provider-core/      MusicProvider interface + ProviderRegistry
  ui/                 Design tokens + Tailwind preset
  utils/              Shared pure helpers
docs/                 ARCHITECTURE, DESIGN, DECISIONS, ROADMAP, MEMORY, DEVELOPMENT, IMPLEMENTATION, DEPLOYMENT, API
docker/               Dockerfiles
scripts/dev.ps1       Windows dev bootstrap
```

---

## Completed Milestones

### M1 — Monorepo & Infrastructure ✅
- Turborepo + Bun workspaces
- Expo moved to `apps/mobile`
- Hono API with `/health` and `/health/deps`
- Python extractor with `/health`
- JioSaavn via `docker/jiosaavn.Dockerfile` (clones upstream, port 3000 internal)
- `docker-compose.yml`: api, extractor, jiosaavn, mongodb
- Requires **Docker Desktop** running for full stack

### M2 — Shared Packages ✅
- Full Zod schemas in `@vibevault/types`
- Server env validation in `@vibevault/config/server`
- Complete `MusicProvider` contract in `@vibevault/provider-core`
- Design tokens + Tailwind preset in `@vibevault/ui`
- Utils: duration formatting, track key normalization, pagination helpers

### M3 — API Foundation ✅
- Hono middleware pipeline: request ID, CORS, global error handler
- Structured logging via **pino** with `X-Request-Id` propagation
- MongoDB (`users`, `refreshSessions` collections with indexes)
- JWT auth (access 15min + refresh 7d with rotation)
- Routes: `POST /v1/auth/register|login|refresh|logout`, `GET /v1/auth/me`
- Test script: `scripts/test-auth.ps1`

### M4 — Provider Layer ✅
- **Extractor** (Python/yt-dlp): metadata, search, stream, download, playlist
- **Spotify service** (Python/SpotifyScraper): search, metadata, playlist import
- **Node adapters**: `youtube`, `jiosaavn`, `spotify` → normalized DTOs
- **Provider registry** wired at API startup
- **Internal test routes** (dev only): `/v1/internal/providers/*`
- Test script: `scripts/test-providers.ps1`

**Provider capabilities:**
| Provider | Search | Stream | Download | Playlist | Video |
|----------|--------|--------|----------|----------|-------|
| youtube | ✓ | ✓ | ✓ | ✓ | ✓ |
| jiosaavn | ✓ | ✓ | ✓ | ✓ | ✗ |
| spotify | ✓ | ✗ | ✗ | ✓ | ✗ |

**Docker services:** api, extractor, jiosaavn, spotify, mongodb

### M5 — Unified Search ✅
- `GET /v1/search?q=&page=&limit=` — parallel fan-out, dedupe, rank (auth required)
- `GET /v1/tracks/:providerId/:externalId` — metadata
- `POST /v1/stream/resolve` — StreamManifest
- `POST /v1/downloads/resolve` — DownloadManifest
- Per-provider timeout (8s) with graceful degradation
- Dedup prefers **jiosaavn > youtube > spotify** for same title/artist
- Test script: `scripts/test-search.ps1`

### M6 — Mobile Shell ✅
- EAS dev build config (`apps/mobile/eas.json`)
- Expo Router: auth stack + tab shell (Home, Search, Library, Settings)
- NativeWind + `@vibevault/ui` tokens; Inter + Plus Jakarta Sans via `expo-font`
- TanStack Query provider + typed API client (`src/lib/api-client.ts`)
- Zustand stores: `auth-store`, `player-store` (skeleton)
- MMKV token storage (native) with web `localStorage` fallback
- Login / Register screens (React Hook Form + Zod)
- Auth guard: unauthenticated → login; authenticated → tabs
- Settings: account info + sign out

**Mobile paths:**
```
apps/mobile/src/
  app/           Expo Router (auth + tabs)
  components/ui/ Screen, VaultButton, VaultInput
  lib/           api-client, storage, query-client, config
  stores/        auth-store, player-store
  providers/     app-providers
```

**Note:** `react-native-mmkv` requires an **EAS dev build** (not Expo Go). Web dev uses `localStorage`.

### M7 — Search UI ✅
- Pill search input with debounced TanStack Query (`400ms`)
- `GET /v1/search` via `musicApi` + `useUnifiedSearch`
- FlashList results with `expo-image` artwork
- Provider badges (YouTube, JioSaavn, Spotify)
- Loading skeletons, empty/error states, partial provider failure banner
- Tap result → queue track + `POST /v1/stream/resolve` (playback engine in M8)

**Search paths:**
```
apps/mobile/src/
  components/search/   SearchInput, TrackRow, ProviderBadge, skeleton, list
  hooks/               use-unified-search, use-play-track, use-debounced-value
  lib/music-api.ts
```

### M8 — Playback Engine ✅
- `react-native-track-player` + `expo-dev-client` (requires EAS dev build)
- Custom entry `apps/mobile/index.js` registers background playback service
- `player-engine` — setup, play, pause, seek, skip, queue, stream resolve
- `playback-service` — lock screen / notification remote controls
- Stream URL auto-refresh via `isStreamExpired` (30s poll)
- `PlayerSync` — progress + playback state → Zustand
- `usePlaybackControls` hook (for M9 mini/full player)
- iOS background audio + Android cleartext for dev streams (`expo-build-properties`)

**Player paths:**
```
apps/mobile/
  index.js                    # RNTP service registration
  src/services/
    player-engine.native.ts   # Core engine
    playback-service.ts       # Remote event handlers
  src/components/player/      # PlayerSync
  src/hooks/use-playback-controls.ts
```

### M9 — Player UI ✅
- Mini-player bar above tab bar (artwork, title, thin progress, play/pause)
- Full-screen Now Playing modal (blur + artwork backdrop, slide animation)
- Gesture seek progress bar with time labels
- Queue sheet (“Up next”) with tap-to-play
- `usePlaybackControls` + `usePlayerUiStore` for UI state
- Haptics on play/pause/skip/seek
- `expo-blur`, `react-native-gesture-handler`

### M10 — Playlist Import ✅
- `POST /v1/playlists/import` — Spotify URL → imported tracks saved to MongoDB
- `GET /v1/playlists`, `GET /v1/playlists/:id` — user library
- Spotify adapter `importPlaylist` (existing) wired through playlist service
- Mobile: Library tab with import flow, playlist list, detail screen with playable tracks
- Re-import same URL updates tracks (upsert by `userId` + `sourceUrl`)
- Test script: `scripts/test-playlists.ps1` (set `SPOTIFY_PLAYLIST_URL`)

---

## Package Dependency Rules

```
apps/mobile  →  ui, types, utils, config (not config/server)
apps/api     →  types, config/server, provider-core, utils
packages/*   →  acyclic; never import from apps/
services/*   →  HTTP only; no TS imports from apps
```

---

## Key Architecture Contracts

### Provider adapter (`@vibevault/provider-core`)
```typescript
MusicProvider { search, getMetadata, resolveStream, importPlaylist, resolveDownload? }
```
Runtime (Node/Python) is invisible to mobile. Spotify metadata only — playback resolves via other providers (TBD at M4/M5).

### Stream manifest (`@vibevault/types`)
```typescript
StreamManifest { deliveryMode: 'direct' | 'proxied', url, expiresAt, ... }
```
Client always plays `url`. Backend can switch to proxy without mobile API changes.

### API envelope (`@vibevault/types`)
```typescript
{ data: T, meta? }  // success
{ error: { code, message, details? } }  // failure
```

---

## Docker Services

| Service | Internal URL | Host |
|---------|--------------|------|
| API | — | localhost:3000 |
| Extractor | extractor:8001 | internal |
| JioSaavn | jiosaavn:3000 | internal |
| Spotify | spotify:8003 | internal |
| MongoDB | mongodb:27017 | localhost:27017 |

---

## Commands

```powershell
bun install
docker compose up --build -d          # needs Docker Desktop
curl http://localhost:3000/health
bun run typecheck
bun run build
bun run dev --filter=@vibevault/mobile
.\scripts\dev.ps1                     # full stack + mobile
```

---

## Open Questions / Deferred

| Item | Status |
|------|--------|
| Spotify → playable stream matching | TBD at M4/M5 (JioSaavn/YouTube match) |
| Nginx + TLS | M14 |
| Proxied streaming | Feature flag ready, not implemented |
| react-native-track-player | ✅ M8 |

---

## Working Protocol

1. Read `docs/MEMORY.md` (this file), `docs/ARCHITECTURE.md`, `docs/DESIGN.md`
2. Explain plan → implement → update docs → suggest commit → summarize
3. Never skip design system for UI work
4. Never leak provider-specific logic past adapters

---

## Documentation Index

| File | Purpose |
|------|---------|
| [MEMORY.md](./MEMORY.md) | Session handoff (this file) |
| [DEVELOPMENT.md](./DEVELOPMENT.md) | Local dev workflow |
| [IMPLEMENTATION.md](./IMPLEMENTATION.md) | Code structure and patterns |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Docker, VPS, EAS |
| [API.md](./API.md) | HTTP API reference |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Living system design |
| [DESIGN.md](./DESIGN.md) | UI/UX source of truth |
| [DECISIONS.md](./DECISIONS.md) | ADR log |
| [ROADMAP.md](./ROADMAP.md) | Milestones |
| [INTERVIEW_PITCH.md](./INTERVIEW_PITCH.md) | Interview narrative |

---

## Suggested Next Commit

```
feat(playlists): add spotify playlist import
```
