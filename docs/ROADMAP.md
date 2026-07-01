# VibeVault Roadmap

> Milestones are sequential. Each must be independently runnable before moving to the next. Every milestone ends with a Git commit and documentation update.

---

## MVP Definition

The first usable version of VibeVault includes **all** of the following:

- [ ] Authentication (individual accounts)
- [ ] Unified search across providers
- [ ] Streaming playback
- [ ] Queue management
- [ ] Premium player UI (Now Playing, mini-player)
- [ ] Spotify playlist import
- [ ] Device downloads
- [ ] Offline playback
- [x] Favorites
- [x] Playback history

Quality and architecture correctness take priority over speed.

---

## Milestone Overview

| # | Milestone | Key deliverable |
|---|-----------|-----------------|
| M1 | Monorepo & Infrastructure | Turborepo + Docker Compose boots all services |
| M2 | Shared Packages | Types, config, provider contracts, design tokens |
| M3 | API Foundation | Auth, MongoDB, logging, health checks |
| M4 | Provider Layer | YouTube, JioSaavn, Spotify adapters + registry |
| M5 | Search & Metadata | Unified search orchestration |
| M6 | Mobile Shell | Expo app, navigation, theme, auth screens |
| M7 | Search UI | Unified search screen with provider results |
| M8 | Playback Engine | track-player, stream resolve, queue |
| M9 | Player UI | Now Playing, mini-player, animations |
| M10 | Playlist Import | Spotify URL → library |
| M11 | Downloads & Offline | Device download, local index, offline play |
| M12 | Library Features | Favorites, history |
| M13 | Polish & Hardening | Skeletons, haptics, error states, performance |
| M14 | VPS Deploy | Production Docker Compose, env templates |

---

## M1 — Monorepo & Infrastructure ✅

**Goal:** Repository structure, tooling, and local dev environment.

### Tasks
- [x] Restructure repo into monorepo layout
- [x] Configure Turborepo + Bun workspaces
- [x] Move Expo app to `apps/mobile`
- [x] Scaffold `apps/api` (Hono + Bun)
- [x] Scaffold `services/extractor` (Python + FastAPI)
- [x] Scaffold `services/jiosaavn` (Docker image from upstream)
- [x] `docker-compose.yml` with api, extractor, jiosaavn, mongodb
- [x] `docker/` Dockerfiles
- [x] `scripts/dev.sh` + `scripts/dev.ps1` — one command to start everything
- [x] Root `.env.example`
- [x] Update `docs/ARCHITECTURE.md` with structure changes

### Done when
```bash
docker compose up
# → MongoDB healthy
# → extractor /health → 200
# → jiosaavn /health → 200
# → api /health → 200
bun run dev --filter=mobile
# → Expo dev server starts
```

### Suggested commit
```
feat(repo): initialize turborepo monorepo and docker infrastructure
```

---

## M2 — Shared Packages ✅

**Goal:** Foundation packages used by API and mobile.

### Tasks
- [x] `packages/types` — core DTOs + Zod schemas (TrackRef, StreamManifest, etc.)
- [x] `packages/config` — env parsing, feature flags, constants
- [x] `packages/provider-core` — MusicProvider interface, registry, capabilities
- [x] `packages/utils` — shared pure helpers
- [x] `packages/ui` — design tokens from DESIGN.md (colors, typography, spacing, radii)
- [x] Wire Tailwind config in mobile to use `@vibevault/ui` tokens

### Done when
- API and mobile both import from shared packages without circular deps
- `bun run build` succeeds across all packages

### Suggested commit
```
feat(packages): add shared types, config, provider-core, and ui tokens
```

---

## M3 — API Foundation ✅

**Goal:** Production-grade API skeleton with auth.

### Tasks
- [x] HTTP framework setup with middleware pipeline
- [x] Structured logging + request ID propagation
- [x] MongoDB connection + User model
- [x] JWT auth (register, login, refresh, logout, me)
- [x] Response envelope + error handling middleware
- [x] Zod request validation on all routes
- [x] `GET /health`, `GET /v1/auth/me`

### Done when
- Register → login → authenticated request works via curl/Postman
- Invalid payloads return structured 400 errors

### Suggested commit
```
feat(api): add foundation with JWT auth and structured errors
```

---

## M4 — Provider Layer ✅

**Goal:** All three MVP providers registered and individually testable.

### Tasks
- [x] Python extractor: metadata + stream URL + download URL endpoints
- [x] JioSaavn adapter: search, metadata, stream (HTTP to jiosaavn service)
- [x] Spotify adapter: search, metadata, playlist import (SpotifyScraper)
- [x] YouTube adapter: delegates to extractor service
- [x] Provider registry with capability flags
- [x] Internal test routes to verify each adapter in isolation

### Done when
- Each provider returns normalized DTOs for its supported capabilities
- Provider failure in one adapter does not crash others

### Suggested commit
```
feat(providers): implement youtube, jiosaavn, and spotify adapters
```

---

## M5 — Search & Metadata ✅

**Goal:** Unified search — the core product feature.

### Tasks
- [x] `GET /v1/search?q=&page=&limit=` — parallel fan-out to providers
- [x] Result normalization + merge + basic deduplication
- [x] `GET /v1/tracks/:providerId/:externalId` — metadata
- [x] `POST /v1/stream/resolve` — StreamManifest
- [x] `POST /v1/downloads/resolve` — DownloadManifest
- [x] Per-provider timeout and graceful degradation

### Done when
- Single search query returns merged results from YouTube, JioSaavn, and Spotify
- Stream resolve returns playable URL for JioSaavn and YouTube tracks

### Suggested commit
```
feat(search): add unified cross-provider search and stream resolution
```

---

## M6 — Mobile Shell

**Goal:** Expo app with design system, navigation, and auth.

### Tasks
- [x] EAS dev build configuration
- [x] Expo Router tab navigation (Home, Search, Library, Settings)
- [x] Apply `@vibevault/ui` tokens via NativeWind
- [x] Load Inter + Plus Jakarta Sans via `expo-font`
- [x] TanStack Query provider + API client
- [x] Zustand stores (auth, player — skeleton)
- [x] MMKV secure token storage
- [x] Login / Register screens (React Hook Form + Zod)
- [x] Remove ACME placeholder content

### Done when
- User can register, login, and see authenticated tab shell
- UI matches DESIGN.md dark theme

### Suggested commit
```
feat(mobile): add app shell with auth and design system
```

---

## M7 — Search UI

**Goal:** Beautiful unified search experience.

### Tasks
- [x] Search screen with pill input (DESIGN.md spec)
- [x] Debounced search via TanStack Query
- [x] FlashList result list with artwork (Expo Image)
- [x] Provider badge per result
- [x] Loading skeletons
- [x] Empty and error states
- [x] Tap result → queue track

### Done when
- User searches, sees merged provider results, can tap to play (stream resolve)

### Suggested commit
```
feat(mobile): add unified search screen with provider results
```

---

## M8 — Playback Engine

**Goal:** Production audio engine with background playback.

### Tasks
- [x] Install and configure `react-native-track-player`
- [x] Playback service (background)
- [x] Stream resolve integration (with expiry refresh)
- [x] Queue store (Zustand)
- [x] Play, pause, skip, seek
- [x] Lock screen / notification controls

### Done when
- Track plays in background with lock screen controls
- Queue skip forward/back works
- Stream URL auto-refreshes on expiry

### Suggested commit
```
feat(player): integrate react-native-track-player with stream resolution
```

---

## M9 — Player UI

**Goal:** Spotify-grade Now Playing experience.

### Tasks
- [x] Mini-player bar (persistent, above tab bar)
- [x] Full-screen Now Playing modal
- [x] Album art immersive layout with blur (Expo Blur)
- [x] Progress bar with gesture seek
- [x] Queue sheet
- [x] Reanimated transitions (mini → full)
- [x] Haptic feedback on play/pause/skip

### Done when
- Player UI matches DESIGN.md principles
- Animations are smooth (60fps target)

### Suggested commit
```
feat(mobile): add now playing UI with animations and queue sheet
```

---

## M10 — Playlist Import

**Goal:** Import Spotify playlists by URL.

### Tasks
- [x] `POST /v1/playlists/import` endpoint
- [x] Spotify adapter playlist resolution
- [x] Mobile: paste URL flow
- [x] Imported playlist saved to user library in MongoDB
- [x] Playlist detail screen

### Done when
- User pastes Spotify playlist URL → tracks appear in library
- Tracks are playable (via stream resolve on matched provider)

### Suggested commit
```
feat(playlists): add spotify playlist import
```

---

## M11 — Downloads & Offline

**Goal:** Download tracks to device and play offline.

### Tasks
- [x] Download manager (foreground + background download)
- [x] Local file storage + MMKV index
- [x] Downloads screen in Library tab
- [x] Offline playback via local `file://` URI
- [x] Download progress UI
- [x] Delete download

### Done when
- User downloads a track, toggles airplane mode, track still plays

### Suggested commit
```
feat(mobile): add device downloads and offline playback
```

---

## M12 — Library Features ✅

**Goal:** Favorites and playback history.

### Tasks
- [x] `GET/POST/DELETE /v1/library/favorites`
- [x] `GET/POST /v1/library/history`
- [x] Favorites screen
- [x] History screen
- [x] Heart toggle on player and search results
- [x] Auto-record history on track play

### Done when
- Favorites persist across sessions
- History shows recently played tracks

### Suggested commit
```
feat(library): add favorites and playback history
```

---

## M13 — Polish & Hardening ✅

**Goal:** App Store quality feel.

### Tasks
- [x] Skeleton loaders on all async screens
- [x] Consistent error toasts / banners
- [x] Pull-to-refresh where appropriate
- [x] Image caching and placeholder artwork
- [ ] Performance audit (FlashList tuning, re-render reduction)
- [ ] Video playback toggle (audio vs video mode) — deferred post-MVP

### Suggested commit
```
feat(mobile): polish UI with skeletons, haptics, and error states
```

---

## M14 — VPS Deploy ✅

**Goal:** Production-ready deployment.

### Tasks
- [x] Production `docker-compose.prod.yml`
- [x] Environment variable documentation
- [x] Nginx reverse proxy + TLS (Let's Encrypt)
- [x] MongoDB backup script
- [x] Mobile production API URL configuration
- [x] EAS build profiles (development, preview, production)

### Suggested commit
```
feat(infra): add production docker compose and nginx deployment
```

---

## Post-MVP Backlog

| Feature | Status | Notes |
|---------|--------|-------|
| Spotify → playable match | ✅ Done | `POST /v1/tracks/match`, playlist Play/Shuffle |
| Queue / skip hardening | ✅ Done | Upcoming-only queue, playback generation token, preloader |
| Search performance | ✅ Done | Per-provider timeouts, 2min cache |
| Web volume control | ✅ Done | Mini popover + Now Playing inline slider |
| Artwork quality | ✅ Done | `upgradeArtworkUrl` in `@vibevault/utils` |
| Proxied streaming fallback | Planned | Enable per-provider via feature flag |
| Apple Music adapter | Planned | New provider adapter only |
| Collaborative playlists | Planned | Shared playlist model |
| Cross-device sync | Planned | Server-side sync strategy |
| Web client polish | Planned | Expo web — playback works; not primary target |
| Recommendations / ML | Planned | Python service extension |
| Admin dashboard | Planned | User management on VPS |
| Performance audit | Planned | FlashList tuning, re-render reduction |
| Video playback toggle | Deferred | `FF_VIDEO_PLAYBACK` |

---

## Working Protocol (per milestone)

1. Read `docs/ARCHITECTURE.md`, `docs/DESIGN.md`, `docs/DECISIONS.md`
2. Explain implementation plan
3. Wait for clarification if needed
4. Implement
5. Update documentation
6. Suggest Git commit
7. Summarize changes before next milestone
