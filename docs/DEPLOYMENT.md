# VibeVault — Deployment Guide

> How to run VibeVault locally and on a VPS. Update this file when infrastructure changes.

---

## Overview

VibeVault runs as a **Docker Compose** stack. All backend services are containerized; the mobile app is built separately with **Expo / EAS** and points at your API URL.

**Local dev:** `docker compose up` (API on `:3000`, MongoDB exposed for tooling)

**Production VPS:** `docker compose -f docker-compose.prod.yml up` (Nginx on `:80`/`:443`, internal services only)

```
  Mobile (EAS) ──► https://api.yourdomain.com
                           │
                    ┌──────▼──────┐
                    │   Nginx     │  :80 / :443 (public)
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  API :3000  │  (internal)
                    └──────┬──────┘
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
   ┌──────────┐    ┌────────────┐    ┌──────────┐
   │ MongoDB  │    │ Extractor  │    │ Spotify  │
   └──────────┘    └────────────┘    └──────────┘
                           │
                    ┌────────────┐
                    │ JioSaavn   │
                    └────────────┘
         (internal Docker network only)
```

---

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Docker | 24+ | Docker Desktop (Windows/Mac) or Docker Engine (Linux) |
| Docker Compose | v2 | Included with modern Docker |
| Bun | 1.2+ | Local dev / building API outside Docker (optional) |
| Git | any | Clone repository |

**VPS minimum (recommended):** 2 vCPU, 4 GB RAM, 40 GB SSD, Ubuntu 22.04+

---

## Environment Variables

Copy `.env.example` to `.env` at the repository root:

```sh
cp .env.example .env
```

### Required for production

| Variable | Example | Description |
|----------|---------|-------------|
| `JWT_SECRET` | `openssl rand -base64 48` | Signs access/refresh tokens — **never use default in prod** |
| `NODE_ENV` | `production` | Set automatically in `docker-compose.prod.yml`; disables `/v1/internal/*` |
| `MONGODB_URI` | `mongodb://mongodb:27017/vibevault` | Mongo connection (Docker service name) |
| `VIBEVAULT_DOMAIN` | `api.yourdomain.com` | Public API hostname (DNS A record → VPS) |
| `CERTBOT_EMAIL` | `you@example.com` | Let's Encrypt registration email |
| `USE_HTTPS` | `false` → `true` | Enable TLS nginx config after certificates exist |

### Service URLs (Docker internal)

| Variable | Default (Compose) | Description |
|----------|-------------------|-------------|
| `EXTRACTOR_URL` | `http://extractor:8001` | yt-dlp Python service |
| `JIOSAAVN_URL` | `http://jiosaavn:3000` | Self-hosted jiosaavn-api |
| `SPOTIFY_URL` | `http://spotify:8003` | SpotifyScraper Python service |
| `PORT` | `3000` | API listen port (internal) |
| `LOG_LEVEL` | `info` | API log verbosity |

### Mobile

| Variable | Example | Description |
|----------|---------|-------------|
| `EXPO_PUBLIC_API_URL` | `https://api.yourdomain.com` | API base URL baked into EAS builds (`eas.json` or EAS Secrets) |

Set per profile in `apps/mobile/eas.json`:

| Profile | Purpose | Typical `EXPO_PUBLIC_API_URL` |
|---------|---------|-------------------------------|
| `development` | Dev client | Set at **Metro start** (see [DEVELOPMENT.md](./DEVELOPMENT.md#api-url-by-target)) — not `localhost` on physical devices |
| `preview` | Internal test builds | `https://api.yourdomain.com` |
| `production` | App Store / Play Store | `https://api.yourdomain.com` |

`apps/mobile/app.config.js` disables Android cleartext traffic when the URL uses `https://`.

### Feature flags (optional)

| Variable | Default | Description |
|----------|---------|-------------|
| `FF_VIDEO_PLAYBACK` | `false` | Video player toggle (future) |
| `FF_SPOTIFY_IMPORT` | `true` | Spotify playlist import |
| `FF_PROXIED_STREAMING` | `false` | Proxy streams through VPS (future) |

---

## Local Deployment (Development)

### 1. Start the stack

```powershell
docker compose up --build -d
```

### 2. Verify health

```sh
curl http://localhost:3000/health
curl http://localhost:3000/health/deps
```

### 3. Stop

```sh
docker compose down
```

To remove MongoDB data: `docker compose down -v`

---

## VPS Deployment (Production)

### 1. Server setup

```sh
sudo apt update && sudo apt upgrade -y
sudo apt install -y git docker.io docker-compose-plugin curl
sudo usermod -aG docker $USER
# re-login for group to apply
```

### 2. Clone and configure

```sh
git clone <your-repo-url> vibevault
cd vibevault
cp .env.example .env
```

Edit `.env`:

```env
JWT_SECRET=<openssl rand -base64 48>
VIBEVAULT_DOMAIN=api.yourdomain.com
CERTBOT_EMAIL=you@example.com
USE_HTTPS=false
MONGODB_URI=mongodb://mongodb:27017/vibevault
```

Point DNS: **A record** `api.yourdomain.com` → your VPS public IP.

### 3. Start production stack (HTTP bootstrap)

```sh
docker compose -f docker-compose.prod.yml up --build -d
```

Verify (HTTP, before TLS):

```sh
curl http://localhost/health
curl http://api.yourdomain.com/health
```

### 4. Obtain TLS certificate

```sh
chmod +x scripts/init-letsencrypt.sh scripts/renew-letsencrypt.sh scripts/deploy-prod.sh scripts/backup-mongodb.sh
./scripts/init-letsencrypt.sh
# Test first: ./scripts/init-letsencrypt.sh --staging
```

Enable HTTPS:

```sh
# In .env:
USE_HTTPS=true

docker compose -f docker-compose.prod.yml up -d --force-recreate nginx
curl https://api.yourdomain.com/health
```

### 5. Firewall

```sh
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
# Do NOT open 27017, 3000, 8001, 8003 publicly
sudo ufw enable
```

### 6. Certificate renewal (cron)

```sh
# Daily at 03:00
0 3 * * * /home/ubuntu/vibevault/scripts/renew-letsencrypt.sh >> /var/log/vibevault-certbot.log 2>&1
```

### 7. MongoDB backups

```sh
./scripts/backup-mongodb.sh
# Windows: .\scripts\backup-mongodb.ps1
```

Backups land in `./backups/vibevault-YYYY-MM-DD-HHMM/`. Copy off-server regularly.

Schedule (cron example — weekly Sunday 04:00):

```sh
0 4 * * 0 /home/ubuntu/vibevault/scripts/backup-mongodb.sh >> /var/log/vibevault-backup.log 2>&1
```

### 8. Deploy updates

```sh
./scripts/deploy-prod.sh
```

Or manually:

```sh
git pull
docker compose -f docker-compose.prod.yml up --build -d
docker image prune -f
```

---

## Docker Services Reference

### Development (`docker-compose.yml`)

| Container | Host port | Notes |
|-----------|-----------|-------|
| `vibevault-api` | **3000** | Direct API access |
| `vibevault-mongodb` | 27017 | Local tooling only |
| Providers | — | Internal |

### Production (`docker-compose.prod.yml`)

| Container | Host port | Notes |
|-----------|-----------|-------|
| `vibevault-nginx` | **80, 443** | Public entrypoint |
| `vibevault-api` | — | Internal only |
| `vibevault-mongodb` | — | **Never expose** |
| Providers | — | Internal |

First `docker compose up --build` can take **5–15 minutes** (JioSaavn + Spotify images).

---

## Nginx

Config lives in `docker/nginx/`:

| File | Purpose |
|------|---------|
| `nginx.conf` | Global settings, rate limits, upstream |
| `conf.d/vibevault.conf` | HTTP bootstrap (default) |
| `conf.d/vibevault.https.conf` | HTTPS template (used when `USE_HTTPS=true`) |
| `proxy_params` | Forwarded headers for Hono |

Rate limits: `/v1/search` 30 req/min per IP; other routes 120 req/min.

---

## Mobile App Deployment (EAS)

The mobile app is **not** in Docker Compose. It is built with [EAS Build](https://docs.expo.dev/build/introduction/) and talks to your API over HTTP(S).

### Prerequisites

- [Expo account](https://expo.dev/signup)
- EAS CLI: `npm install -g eas-cli` (or `npx eas-cli`)
- Run `eas init` once in `apps/mobile` if `app.json` still has `replace-with-eas-project-id`

### Configure API URL

| Build type | Where to set `EXPO_PUBLIC_API_URL` |
|------------|-------------------------------------|
| Dev client + Metro | `apps/mobile/.env` or shell when running `expo start --dev-client` |
| Standalone EAS build | `apps/mobile/eas.json` per profile, or [EAS Secrets](https://docs.expo.dev/build-reference/variables/) |

Profiles in `apps/mobile/eas.json`:

| Profile | Purpose | Typical API URL |
|---------|---------|-----------------|
| `development` | Dev client (APK / iOS simulator) | Set at Metro time — see below |
| `preview` | Internal test APK/IPA | `https://api.yourdomain.com` |
| `production` | Store release | `https://api.yourdomain.com` |

**Important:** `http://localhost:3000` in the `development` profile only works for **web** or **iOS Simulator on the same Mac**. Real devices need your PC’s LAN IP or a deployed API:

| Target | URL |
|--------|-----|
| Android emulator | `http://10.0.2.2:3000` |
| Physical phone (same Wi‑Fi) | `http://<lan-ip>:3000` |
| Production / preview | `https://api.yourdomain.com` |

`apps/mobile/app.config.js` enables Android cleartext traffic when the URL uses `http://`.

### First-time EAS setup

```powershell
cd apps\mobile
eas login
eas init
```

### Build profiles

```powershell
cd apps\mobile

# Dev client — install APK, then use expo start --dev-client
eas build --profile development --platform android

# Internal test (HTTPS production API)
eas build --profile preview --platform android

# Store release
eas build --profile production --platform android
```

iOS from Windows: cloud builds work, but **simulator** dev builds only run on a Mac; physical iPhone needs Apple Developer enrollment.

### Run and test after install

```powershell
# Terminal 1 — backend
docker compose up --build -d

# Terminal 2 — Metro (set API URL for your device)
cd apps\mobile
$env:EXPO_PUBLIC_API_URL="http://192.168.1.42:3000"
npx expo start --dev-client
```

Download the APK from expo.dev → Builds, install, open the app, connect to Metro (QR or `a` for emulator).

Full native test checklist: [DEVELOPMENT.md — Native test checklist](./DEVELOPMENT.md#native-test-checklist).

### OTA updates (optional)

```sh
eas update --branch production
```

---

## Security Checklist (Production)

- [ ] Strong `JWT_SECRET` (32+ random bytes)
- [ ] `NODE_ENV=production` (enforced by prod compose)
- [ ] MongoDB and provider ports not exposed publicly
- [ ] HTTPS enabled (`USE_HTTPS=true`) before sharing with users
- [ ] Firewall: only 22, 80, 443
- [ ] SSH key auth, disable password login
- [ ] Scheduled cert renewal + MongoDB backups
- [ ] Treat as **private use** — scraping carries ToS/legal risk

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| nginx won't start with `USE_HTTPS=true` | Certs missing | Run `init-letsencrypt.sh` first |
| `JWT_SECRET` compose error | Empty secret in `.env` | Generate and set `JWT_SECRET` |
| API stuck on `depends_on` | Slow provider build | `docker compose -f docker-compose.prod.yml logs jiosaavn` |
| Mobile can't reach API | Wrong `EXPO_PUBLIC_API_URL` | Physical device: use LAN IP, not `localhost`. Preview/prod: `https://` domain |
| EAS build fails on project ID | Placeholder in `app.json` | Run `eas init` in `apps/mobile` |
| Dev client won't load JS | Network / firewall | Same Wi‑Fi; allow port 3000; try `expo start --dev-client --tunnel` |
| Search very slow first time | Cold provider containers | Wait for `docker compose` health; rebuild API image after API changes |
| `401` on `/v1/search` | No auth token | Register/login first |
| certbot fails | DNS not propagated | Wait for A record; try `--staging` |

---

## Related Docs

| Doc | Purpose |
|-----|---------|
| [DEVELOPMENT.md](./DEVELOPMENT.md) | Local dev workflow |
| [API.md](./API.md) | Endpoints and auth |
| [IMPLEMENTATION.md](./IMPLEMENTATION.md) | Code structure |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design |
