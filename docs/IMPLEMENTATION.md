# VibeVault — Implementation Guide

> How the codebase is organized, how features are built, and where to add code. Update when structure or patterns change.

---

## Project Status

| Milestone | Status | What exists |
|-----------|--------|-------------|
| M1 Monorepo & infra | ✅ | Turborepo, Docker Compose, Expo shell |
| M2 Shared packages | ✅ | types, config, provider-core, ui, utils |
| M3 API foundation | ✅ | Auth, MongoDB, logging, middleware |
| M4 Provider layer | ✅ | YouTube, JioSaavn, Spotify adapters |
| M5 Unified search | ✅ | Search orchestration, stream/download resolve |
| M6 Mobile shell | ✅ | Auth UI, tabs, design system |
| M7 Search UI | ✅ | Unified search screen |
| M8 Playback engine | ✅ | react-native-track-player |
| M9 Player UI | ✅ | Mini bar + Now Playing modal |
| M10 Playlist import | ✅ | Spotify URL import + library |
| M11 Downloads | ✅ | Device downloads + offline playback |
| M12 Library features | ✅ | Favorites + playback history |
| M13 Polish | ✅ | Skeletons, toasts, pull-to-refresh, artwork placeholders |
| M14 VPS deploy | ✅ | Production Docker, nginx, TLS, backups, EAS |

**MVP (M1–M14) is complete.** Post-MVP playback/search polish documented in MEMORY.md. Further backlog in ROADMAP.md.

---

## Repository Structure

```
vibevault/
├── apps/
│   ├── mobile/                 # Expo 54 + NativeWind (iOS/Android)
│   └── api/                    # Hono API on Bun
│       └── src/
│           ├── app.ts          # Route assembly
│           ├── index.ts        # DB connect, provider registry, serve
│           ├── routes/         # HTTP handlers
│           ├── services/       # Business logic
│           ├── providers/      # Provider adapters (Node)
│           ├── clients/        # HTTP clients to Python services
│           ├── repositories/   # MongoDB data access
│           ├── middleware/     # Auth, errors, request ID
│           └── lib/            # db, jwt, logger, http-client
├── services/
│   ├── extractor/              # Python — yt-dlp
│   ├── spotify/                # Python — SpotifyScraper
│   └── jiosaavn/               # Docker build from upstream (no local source)
├── packages/
│   ├── types/                  # Zod schemas + inferred types
│   ├── config/                 # Env, constants, feature flags
│   ├── provider-core/        # MusicProvider interface + registry
│   ├── ui/                     # Design tokens + Tailwind preset
│   └── utils/                  # Pure helpers (dedupe, duration, etc.)
├── docker/                     # Dockerfiles
├── scripts/                    # dev.ps1, test-*.ps1
├── docs/                       # All documentation
└── docker-compose.yml
```

---

## Layered Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Mobile (apps/mobile)                                   │
│  UI only — never imports provider implementations       │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS + JSON
┌────────────────────────▼────────────────────────────────┐
│  API Routes (apps/api/src/routes/)                      │
│  Validation (Zod) → Services → Response envelope        │
└────────────────────────┬────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
   Auth service    Search service   Media service
         │               │               │
         ▼               ▼               ▼
   MongoDB         Provider registry   Provider adapters
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
   Extractor        JioSaavn API     Spotify service
   (Python)         (Node/Bun)       (Python)
```

### Rules

1. **Routes** are thin — validate input, call service, return `{ data }`.
2. **Services** contain business logic — no HTTP framework types in providers.
3. **Providers** normalize external data to `@vibevault/types` DTOs.
4. **Python services** return provider-specific JSON; adapters map to shared types.
5. **Packages** never import from `apps/`.

---

## Adding a New Provider

1. **Service** (if new runtime): add `services/<name>/` + `docker/<name>.Dockerfile` + Compose service.
2. **Client**: `apps/api/src/clients/<name>-client.ts` — HTTP calls only.
3. **Adapter**: `apps/api/src/providers/<name>.adapter.ts` — implement `MusicProvider`.
4. **Mappers**: extend `apps/api/src/providers/mappers.ts`.
5. **Register**: `apps/api/src/providers/index.ts`.
6. **Types**: add provider ID to `ProviderIdSchema` in `@vibevault/types`.
7. **Docs**: update `ARCHITECTURE.md`, `API.md`, this file.

No changes required in search orchestrator or mobile if the adapter implements the contract.

---

## Key Implementation Areas

### Authentication (`apps/api/src/services/auth-service.ts`)

- Passwords: `Bun.password` bcrypt (cost 12)
- Access token: JWT, 15 minutes, stateless
- Refresh token: JWT + MongoDB `refreshSessions` collection (revocable)
- Routes: `/v1/auth/register`, `/login`, `/refresh`, `/logout`, `/me`

### Unified search (`apps/api/src/services/search-service.ts`)

1. Fan-out to all `providerRegistry.listSearchable()` in parallel
2. Per-provider timeouts: **JioSaavn 5s**, **Spotify 4s**, **YouTube 6s**
3. In-memory cache (2 minutes) for identical queries
4. Merge results → assign relevance scores → dedupe by title+artist
5. Dedup priority: **jiosaavn > youtube > spotify**
6. Rank and paginate

Failed providers go in `providersFailed`; partial results still return.

### Cross-provider match (`apps/api/src/services/match-service.ts`)

Used when metadata is not directly playable (Spotify tracks). `POST /v1/tracks/match`:

1. Build query from `title` + primary artist
2. Search JioSaavn (limit 8), pick best match by title/artist/duration
3. If none, search YouTube (limit 5) and pick again
4. Return normalized `SearchResult` with playable `ref`

Mobile caches matches in `playable-cache.ts` and dedupes in-flight requests via `resolve-playable-track.ts`.

### Streaming (`apps/api/src/services/media-service.ts`)

- **Option A:** API returns direct CDN URL; client plays it
- `StreamManifest.deliveryMode: 'direct'` today; `'proxied'` later via feature flag
- Spotify does **not** stream — returns `501` for Spotify `trackRef`

### Provider adapters

| Adapter | File | Backend |
|---------|------|---------|
| YouTube | `youtube.adapter.ts` | `services/extractor` (yt-dlp) |
| JioSaavn | `jiosaavn.adapter.ts` | `services/jiosaavn` (HTTP) |
| Spotify | `spotify.adapter.ts` | `services/spotify` (SpotifyScraper) |

### Shared types (`packages/types`)

Zod schemas are the **single source of truth**. API validates requests/responses; mobile imports the same types.

```typescript
// Success
{ data: T, meta?: Record<string, unknown> }

// Error
{ error: { code: string, message: string, details?: unknown } }
```

### Design system (`packages/ui` + `docs/DESIGN.md`)

- Tokens: colors, typography, spacing, shadows
- Tailwind preset: `@vibevault/ui/tailwind`
- Fonts: Inter + Plus Jakarta Sans (open source)
- **Read `DESIGN.md` before any UI work**

---

## Mobile (Current State)

`apps/mobile` has an authenticated **tab shell** with login/register, design tokens, and API wiring.

**Implemented (M6–M14 + post-MVP polish):**

```
src/
├── app/
│   ├── _layout.tsx          # Fonts, splash, providers, auth hydrate
│   ├── index.tsx            # Auth redirect
│   ├── (auth)/              # login, register
│   └── (tabs)/              # home, search, library, settings
├── components/
│   ├── ui/                  # Screen, skeleton, toast, artwork
│   ├── search/              # SearchInput, TrackRow, add-to-queue
│   ├── library/             # playlist-actions, library-track-row
│   └── player/              # mini-player, now-playing, queue, volume (web)
├── hooks/
│   ├── use-unified-search.ts
│   ├── use-play-track.ts
│   └── use-scroll-bottom-inset.ts
├── lib/
│   ├── api-client.ts        # Typed fetch + JWT refresh
│   ├── music-api.ts         # search, match, stream resolve
│   ├── resolve-playable-track.ts, playable-cache.ts
│   ├── storage.ts           # MMKV (native) / localStorage (web)
│   └── config.ts            # EXPO_PUBLIC_API_URL
├── stores/
│   ├── auth-store.ts
│   ├── player-store.ts      # currentTrack, queue (upcoming only), volume
│   └── download-store.ts
├── services/
│   ├── player-engine.native.ts / .web.ts
│   ├── playback-core.ts, playback-session.ts
│   ├── queue-preloader.ts   # pre-match next 3 tracks
│   └── download-manager.*.ts
└── providers/app-providers.tsx
```

**Queue behavior:** `player-store.queue` holds **upcoming** tracks only. `addToQueue()` is explicit (UI button). Play/skip uses a playback generation token so stale async resolves cannot corrupt the queue after rapid skips.

**Web vs native:** Native uses `react-native-track-player`. Web uses `web-audio-player.ts` with optional volume UI (`*.web.tsx` platform files).

**MVP (M1–M14) is complete.** Post-MVP backlog in ROADMAP.md.

Stack:

| Concern | Library |
|---------|---------|
| Routing | Expo Router |
| Styling | NativeWind |
| Server state | TanStack Query |
| Client state | Zustand |
| Forms | React Hook Form + Zod |
| Playback | react-native-track-player (EAS dev build) |
| Storage | MMKV |

**Env:** `EXPO_PUBLIC_API_URL` (default `http://localhost:3000`). See [DEVELOPMENT.md](./DEVELOPMENT.md#api-url-by-target) for emulator, physical device, and production URLs.

**Dev builds:** MMKV and `react-native-track-player` need an EAS dev client. Full walkthrough: [DEVELOPMENT.md — EAS Dev Build](./DEVELOPMENT.md#eas-dev-build--native-testing).

```powershell
cd apps/mobile
eas login
eas init
eas build --profile development --platform android
$env:EXPO_PUBLIC_API_URL="http://10.0.2.2:3000"   # emulator; use LAN IP on physical device
npx expo start --dev-client
```

Web (`w` in Expo) supports auth/search UI; web audio playback works via `web-audio-player` but native features (downloads, background audio, lock screen) require a dev build.

---

## Coding Standards

| Area | Convention |
|------|------------|
| TS files | `kebab-case.ts` |
| React components | `PascalCase.tsx` |
| API routes | `/v1/kebab-case` |
| Env vars | `SCREAMING_SNAKE` |
| Commits | Conventional: `feat(api): ...`, `fix(mobile): ...` |
| Errors | Typed `AppError` / `ProviderError` with stable `code` |
| Config | No hardcoded URLs — use `@vibevault/config` |
| UI colors | No hardcoded hex — use `@vibevault/ui` tokens |

---

## Testing Without UI

Backend is testable via scripts (no mobile app required):

| Script | Purpose |
|--------|---------|
| `scripts/test-auth.ps1` | Register, login, me, refresh, logout |
| `scripts/test-providers.ps1` | Per-provider search via internal routes |
| `scripts/test-search.ps1` | Unified search + stream resolve (auto-login) |

Internal routes (`/v1/internal/*`) are available when `NODE_ENV !== production` and **do not require auth**.

Public music routes (`/v1/search`, etc.) require JWT. Use the mobile login/register screens or `scripts/test-search.ps1` for API testing.

---

## Milestone Workflow

1. Read `MEMORY.md`, `DESIGN.md` (if UI), `ARCHITECTURE.md`
2. Explain plan
3. Implement smallest runnable increment
4. Update docs (`MEMORY.md`, relevant guides)
5. Suggest conventional commit
6. Summarize before next milestone

---

## Related Docs

| Doc | Purpose |
|-----|---------|
| [DEVELOPMENT.md](./DEVELOPMENT.md) | Day-to-day dev setup |
| [API.md](./API.md) | Endpoint reference |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Docker and VPS |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design |
| [DESIGN.md](./DESIGN.md) | UI/UX |
| [ROADMAP.md](./ROADMAP.md) | Milestones |
