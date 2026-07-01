# VibeVault — Session Memory

> **Read this first in every new session.** Living handoff document — update after every milestone.

**Last updated:** 2026-06-29 · **Current milestone:** M14 complete + post-MVP playback/search polish

---

## What Is VibeVault?

Self-hosted, multi-provider music + music-video app for **iOS & Android**. Friends/household share a **VPS** with individual accounts. **Unified search** across providers is the product identity.

| Area | Decision |
|------|----------|
| Mobile | Expo 54, EAS dev builds, NativeWind, TanStack Query, Zustand, track-player |
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
- Per-provider timeouts (JioSaavn 5s, Spotify 4s, YouTube 6s) + 2min in-memory cache
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

### M11 — Downloads & Offline ✅
- `POST /v1/downloads/resolve` wired on mobile via `musicApi.resolveDownload`
- Download manager (`expo-file-system/legacy`) saves to app documents + MMKV index
- Offline playback: player prefers local `file://` before stream resolve
- Library → Downloads screen (list, progress, delete)
- Download button on Search + playlist tracks (YouTube/JioSaavn only)
- Stream expiry refresh skipped for local playback

### M12 — Library Features ✅
- `GET/POST/DELETE /v1/library/favorites` — per-user favorites in MongoDB
- `GET/POST /v1/library/history` — playback history (deduped by track, newest first)
- Mobile: Favorites + History screens under Library tab
- Heart toggle on search results + Now Playing modal
- Auto-record history on successful play (`use-play-track`)
- Test script: `scripts/test-library.ps1`

**Library paths:**
```
apps/api/src/
  routes/library.ts
  services/library-service.ts
  repositories/library-repository.ts
apps/mobile/src/
  lib/library-api.ts
  hooks/use-favorites.ts, use-history.ts
  components/library/favorite-button.tsx, library-track-row.tsx
  app/(tabs)/library/favorites.tsx, history.tsx
```

### M13 — Polish & Hardening ✅
- Shared skeleton loaders (`TrackListSkeleton`, `PlaylistListSkeleton`, `PlaylistDetailSkeleton`)
- `ErrorState` component with retry on library screens
- Global toast host for play, favorite, and download failures
- Pull-to-refresh on playlists, favorites, history, playlist detail
- `ArtworkImage` with memory-disk cache + musical-notes placeholder

**Polish paths:**
```
apps/mobile/src/
  components/ui/skeleton.tsx, error-state.tsx, toast-host.tsx, artwork-image.tsx
  stores/toast-store.ts
  lib/error-message.ts
```

### M14 — VPS Deploy ✅
- `docker-compose.prod.yml` — production stack (no public MongoDB/API ports)
- Nginx reverse proxy + rate limits (`docker/nginx/`)
- Let's Encrypt via `scripts/init-letsencrypt.sh` + `scripts/renew-letsencrypt.sh`
- `scripts/backup-mongodb.sh` / `.ps1` + `scripts/deploy-prod.sh`
- EAS profiles (development, preview, production) + `app.config.js` for HTTPS/cleartext
- Full guide: `docs/DEPLOYMENT.md`

**Infra paths:**
```
docker-compose.prod.yml
docker/nginx/
scripts/init-letsencrypt.sh, renew-letsencrypt.sh, backup-mongodb.sh, deploy-prod.sh
apps/mobile/eas.json, app.config.js
```

### Post-MVP — Playback, Queue & Spotify Polish ✅
- **Queue semantics:** `queue` = upcoming tracks only; `addToQueue()` is explicit; Play does not auto-add
- **Skip safety:** playback generation token — rapid skips ignore stale match/resolve completions
- **Queue preloader:** pre-match + pre-resolve next 3 tracks (`queue-preloader.ts`, `playable-cache.ts`)
- **Spotify playback:** `POST /v1/tracks/match` (JioSaavn-first, YouTube fallback) + playlist Play/Shuffle/Download
- **Spotify artwork:** oEmbed fallback + `playlist-artwork-service` enrichment on read
- **Search UX:** Likes/History hub removed from Search tab (Home/Library only)
- **Web volume:** mini-player vertical popover (portal); Now Playing horizontal slider beside skip-forward (centered transport)
- **Artwork:** `upgradeArtworkUrl` / `pickBestImageUrl` → higher-res thumbnails

**Key paths:**
```
apps/api/src/services/match-service.ts, search-service.ts
apps/mobile/src/services/resolve-playable-track.ts, queue-preloader.ts, playback-session.ts
apps/mobile/src/components/player/playback-buttons.web.tsx, inline-volume-control.web.tsx
apps/mobile/src/components/library/playlist-actions.tsx
packages/utils/src/image.ts
```

**EAS / testing:** See `docs/DEVELOPMENT.md` — `eas init`, `eas build --profile development`, `expo start --dev-client`, API URL by device type.

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
Runtime (Node/Python) is invisible to mobile. Spotify is metadata-only — playback uses `POST /v1/tracks/match` then stream resolve on JioSaavn/YouTube.

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

# Native dev build (once) + daily Metro
cd apps/mobile && eas build --profile development --platform android
cd apps/mobile && npx expo start --dev-client
```

---

## Open Questions / Deferred

| Item | Status |
|------|--------|
| Spotify → playable stream matching | ✅ `POST /v1/tracks/match` + mobile `resolve-playable-track` |
| Nginx + TLS | ✅ M14 |
| Proxied streaming | Feature flag ready, not implemented |
| react-native-track-player | ✅ M8 |
| EAS project linking | Run `eas init` if `app.json` has placeholder `projectId` |

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

MVP milestones M1–M14 are complete. Post-MVP polish (queue, match, search, volume) is documented above. See ROADMAP.md for remaining backlog.
