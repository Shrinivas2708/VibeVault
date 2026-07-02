FROM oven/bun:1.3 AS base
WORKDIR /app

# Install workspace dependencies
COPY package.json bun.lock turbo.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/mobile/package.json ./apps/mobile/
COPY packages/config/package.json ./packages/config/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/
COPY packages/provider-core/package.json ./packages/provider-core/
COPY packages/ui/package.json ./packages/ui/

RUN bun install --frozen-lockfile --ignore-scripts

# Copy source
COPY apps/api ./apps/api
COPY packages/config ./packages/config
COPY packages/types ./packages/types
COPY packages/utils ./packages/utils
COPY packages/provider-core ./packages/provider-core
COPY packages/ui ./packages/ui
COPY tsconfig.json ./

WORKDIR /app/apps/api
EXPOSE 3000

CMD ["bun", "run", "src/index.ts"]
