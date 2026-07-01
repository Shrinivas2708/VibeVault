import type { PaginationMeta } from "@vibevault/types";

export { normalizeTrackKey } from "./strings";
export {
  assignRelevanceScores,
  boostQueryMatch,
  deduplicateSearchResults,
  rankSearchResults,
} from "./search";
export {
  boostYouTubeMusicSignals,
  buildYouTubeQueriesFromHints,
  filterYouTubeSearchResults,
} from "./youtube-search";

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "0:00";

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const paddedSeconds = seconds.toString().padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${paddedSeconds}`;
  }

  return `${minutes}:${paddedSeconds}`;
}

export function buildPaginationMeta(
  page: number,
  limit: number,
  resultCount: number,
  total?: number,
): PaginationMeta {
  const hasMore =
    total !== undefined ? page * limit < total : resultCount >= limit;

  return {
    page,
    limit,
    total,
    hasMore,
  };
}

export function isStreamExpired(
  expiresAt: string,
  bufferMs = 30_000,
  now = Date.now(),
): boolean {
  const expiry = new Date(expiresAt).getTime();
  return Number.isNaN(expiry) || expiry - bufferMs <= now;
}
