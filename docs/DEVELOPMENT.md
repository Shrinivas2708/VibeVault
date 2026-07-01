# VibeVault — Development Guide

> Day-to-day workflow for working on VibeVault locally.

---

## Prerequisites

Install before starting:

| Tool | Install |
|------|---------|
| [Bun](https://bun.sh) | `curl -fsSL https://bun.sh/install \| bash` |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | Required for backend stack |
| [Git](https://git-scm.com/) | Clone repo |
| Node (optional) | Expo tooling; Bun is primary |

For native mobile: [Expo account](https://expo.dev/signup), [EAS CLI](https://docs.expo.dev/build/setup/), Android Studio (emulator) or a physical Android device. iOS simulator builds require a Mac; physical iPhone needs an Apple Developer account.

---

## First-Time Setup

```sh
git clone <repo-url> vibevault
cd vibevault
bun install
cp .env.example .env
```

Start Docker Desktop, then:

```sh
docker compose up --build -d
```

Verify:

```sh
curl http://localhost:3000/health
```

---

## Daily Workflow

### Option A — Full stack script

```powershell
# Windows
.\scripts\dev.ps1
```

```sh
# macOS / Linux
./scripts/dev.sh
```

Starts Docker, waits for API health, runs `bun run dev --filter=@vibevault/mobile`.

### Option B — Manual (recommended while backend-only)

**Terminal 1 — Docker backend:**

```sh
docker compose up --build
```

**Terminal 2 — API hot reload (optional, outside Docker):**

```sh
cd apps/api
bun run dev
```

Uses local MongoDB at `mongodb://localhost:27017/vibevault` if you set that in `.env` instead of the Docker hostname.

**Terminal 3 — Mobile:**

```sh
bun run dev --filter=@vibevault/mobile
```

Set `EXPO_PUBLIC_API_URL` when starting Metro (see [API URL by target](#api-url-by-target) below). Expo reads `.env` from `apps/mobile/` (not the repo root).

**Web vs native:** Press `w` in Expo for web — auth, search, and UI work; **playback and downloads require a native EAS dev build** (`react-native-track-player`, MMKV).

---

## EAS Dev Build & Native Testing

Expo Go is **not supported** — the app uses `react-native-mmkv`, `react-native-track-player`, and `expo-dev-client`.

### One-time setup

```powershell
cd apps\mobile
npm install -g eas-cli    # optional; or use npx eas-cli
eas login
eas init                  # links project — replaces placeholder projectId in app.json
```

First `eas build` will prompt for Android package name (e.g. `com.yourname.vibevault`). Let EAS manage the keystore unless you already have one.

### Build the dev client

```powershell
cd apps\mobile
eas build --profile development --platform android
```

| Profile | Output | When to use |
|---------|--------|-------------|
| `development` | Dev client APK (Android) / simulator build (iOS) | Daily dev — loads JS from Metro |
| `preview` | Standalone APK/IPA | Share with testers; needs HTTPS API |
| `production` | Store build | App Store / Play Store |

First cloud build usually takes **10–20 minutes**. Download the APK from [expo.dev](https://expo.dev) → your project → **Builds**, then install on a device (enable “Install unknown apps”) or drag onto an Android emulator.

### Connect dev client to Metro

Backend must be running (`docker compose up --build -d`). Set the API URL, then start the dev server:

```powershell
cd apps\mobile
$env:EXPO_PUBLIC_API_URL="http://192.168.1.42:3000"   # see table below
npx expo start --dev-client
```

- **Emulator:** press `a` in the terminal
- **Physical phone:** scan QR (same Wi‑Fi as PC); use `--tunnel` if LAN discovery fails

Rebuild with EAS only when **native** dependencies change (new native module, SDK bump). Day-to-day JS changes reload from Metro.

### API URL by target

| Target | `EXPO_PUBLIC_API_URL` |
|--------|------------------------|
| Web (`expo start --web`) | `http://localhost:3000` |
| Android emulator | `http://10.0.2.2:3000` |
| Physical phone (same Wi‑Fi) | `http://<your-pc-lan-ip>:3000` |
| Preview / production EAS build | `https://api.yourdomain.com` |

Find LAN IP: `ipconfig` (Windows) or `ip addr` (Linux). Allow inbound TCP **3000** through Windows Firewall if the phone cannot reach the API.

`apps/mobile/eas.json` bakes `EXPO_PUBLIC_API_URL` into **standalone** EAS builds. For dev-client workflow, the value at **Metro start time** (`.env` or shell env) is what matters for JS bundles.

### Native test checklist

After installing the dev client APK and connecting to Metro:

1. **Auth** — register, log in, kill app, reopen (session persists)
2. **Search** — query returns results (API reachable)
3. **Play** — tap track → mini-player → audio plays
4. **Queue** — use “Add to queue” explicitly; Play does not auto-queue; “Up next” excludes current track
5. **Spotify playlists** — import URL → Play / Shuffle (matches via `POST /v1/tracks/match`)
6. **Downloads** — download track → play from Downloads offline
7. **Background** — lock screen / notification controls continue playback

---

## Common Commands

| Command | Description |
|---------|-------------|
| `bun install` | Install all workspace dependencies |
| `bun run typecheck` | TypeScript check all packages |
| `bun run build` | Build all packages |
| `bun run dev --filter=@vibevault/api` | API with watch mode |
| `bun run dev --filter=@vibevault/mobile` | Expo dev server |
| `docker compose up -d` | Start backend in background |
| `docker compose down` | Stop backend |
| `docker compose logs -f api` | Follow API logs |
| `docker compose up --build -d` | Rebuild after Dockerfile changes |

---

## Testing the API (No UI)

### Health (no auth)

```sh
curl http://localhost:3000/health
curl http://localhost:3000/health/deps
```

### Auth

```powershell
.\scripts\test-auth.ps1
```

Or manually:

```sh
curl -X POST http://localhost:3000/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"you@test.com","password":"password123","displayName":"You"}'
```

Save `data.tokens.accessToken` from the response.

### Unified search (auth required)

```powershell
.\scripts\test-search.ps1
```

Or with a token:

```sh
curl "http://localhost:3000/v1/search?q=believer&limit=5" \
  -H "Authorization: Bearer <accessToken>"
```

### Per-provider (dev only, no auth)

Only when `NODE_ENV=development`:

```sh
curl http://localhost:3000/v1/internal/providers
curl "http://localhost:3000/v1/internal/providers/jiosaavn/search?query=test&limit=3"
```

```powershell
.\scripts\test-providers.ps1
```

---

## Auth During Development

Search/stream routes require JWT (M5). The mobile app (M6) provides login/register screens that persist tokens via MMKV.

**Without the app:**

- Use `scripts/test-search.ps1` (auto-registers a test user)
- Use `scripts/test-auth.ps1`
- Use `/v1/internal/*` routes to test providers without auth (dev only)

---

## Environment Files

| File | Committed | Purpose |
|------|-----------|---------|
| `.env.example` | Yes | Template (repo root — API / Docker) |
| `.env` | No (gitignored) | Your local secrets (repo root) |
| `apps/mobile/.env` | No (gitignored) | `EXPO_PUBLIC_API_URL` for Expo / Metro |

Copy root env: `cp .env.example .env`. For mobile, create `apps/mobile/.env` or set the variable in your shell when running `expo start`.

**Local API outside Docker** — use:

```env
MONGODB_URI=mongodb://localhost:27017/vibevault
EXTRACTOR_URL=http://localhost:8001
JIOSAAVN_URL=http://localhost:3001
SPOTIFY_URL=http://localhost:8003
```

You must expose provider ports in `docker-compose.yml` for host networking, or run API inside Compose (default).

---

## Working on Packages

Shared packages live in `packages/`. After changing one:

```sh
bun run typecheck --filter=@vibevault/types
bun run build --filter=@vibevault/utils
```

Turbo caches builds — run from repo root.

### Package dependency graph

```
types          (no internal deps)
config         → zod
utils          → types
provider-core  → types
ui             (standalone tokens)
api            → types, config, provider-core, utils
mobile         → types, ui, config
```

---

## Working on Python Services

### Extractor (yt-dlp)

```sh
cd services/extractor
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

### Spotify (SpotifyScraper)

```sh
cd services/spotify
python -m venv .venv
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8003
```

---

## Git Conventions

```
feat(api): add playlist import endpoint
feat(mobile): add login screen
fix(extractor): handle expired youtube URLs
docs: update deployment guide
chore: bump yt-dlp
```

One logical change per commit. Split unrelated work.

---

## IDE Tips

- Open repo root in Cursor/VS Code
- TypeScript project references resolve via Bun workspaces
- Read `docs/MEMORY.md` at the start of each session
- For UI: read `docs/DESIGN.md` first

---

## Troubleshooting

See [DEPLOYMENT.md — Troubleshooting](./DEPLOYMENT.md#troubleshooting).

---

## Related Docs

| Doc | Purpose |
|-----|---------|
| [IMPLEMENTATION.md](./IMPLEMENTATION.md) | Code structure |
| [API.md](./API.md) | Endpoints |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Docker / VPS |
