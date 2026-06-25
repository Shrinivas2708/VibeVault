# VibeVault

Self-hosted, multi-provider music platform for iOS and Android.

## Documentation

| Document | Description |
|----------|-------------|
| [MEMORY.md](docs/MEMORY.md) | Session handoff — read first in new sessions |
| [DEVELOPMENT.md](docs/DEVELOPMENT.md) | Local dev workflow and testing |
| [IMPLEMENTATION.md](docs/IMPLEMENTATION.md) | Code structure and how to build features |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Docker, VPS, and EAS deployment |
| [API.md](docs/API.md) | HTTP API reference |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, APIs, folder structure |
| [DESIGN.md](docs/DESIGN.md) | UI/UX source of truth |
| [DECISIONS.md](docs/DECISIONS.md) | Architecture decision log |
| [ROADMAP.md](docs/ROADMAP.md) | Milestones and delivery plan |
| [INTERVIEW_PITCH.md](docs/INTERVIEW_PITCH.md) | Project narrative for interviews |

## Prerequisites

- [Bun](https://bun.sh) 1.2+
- [Docker](https://www.docker.com/) Desktop
- Expo Go or EAS dev build (dev builds required for native modules later)

## Quick Start

```powershell
# Windows
.\scripts\dev.ps1
```

```sh
# macOS / Linux
./scripts/dev.sh
```

Or manually:

```sh
bun install
docker compose up --build -d
bun run dev --filter=@vibevault/mobile
```

## Services

| Service | URL | Description |
|---------|-----|-------------|
| API | http://localhost:3000/health | Node/TypeScript API |
| Extractor | internal :8001 | Python yt-dlp service |
| Spotify | internal :8003 | Self-hosted SpotifyScraper service |
| JioSaavn | internal :3000 | Self-hosted jiosaavn-api |
| MongoDB | localhost:27017 | Database (`users`, `refreshSessions`, `playlists`) |

## Monorepo

```
apps/mobile     Expo app
apps/api        Node API
services/       Python + containerized provider services
packages/       Shared types, config, UI tokens, provider contracts
```

## Status

**Milestone 10 complete** — Spotify playlist import and library UI. Next: M11 (Downloads & Offline).
