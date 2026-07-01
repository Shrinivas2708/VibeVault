import type { SearchResult } from "@vibevault/types";

/** Title patterns that are usually not the song itself. */
const CLUTTER_PATTERN =
  /\b(reaction|reactions|reacts|reacting|react to|official trailer|trailer|teaser|full movie|full film|movie review|film review|breakdown|explained|explainer|interview|podcast|my thoughts? on|reviewing|reviews|live stream|highlights|recap|scene|#shorts|shorts)\b/i;

const CLUTTER_SYMBOLS = /[|#]|→/;

/** Signals that a YouTube upload is likely the actual track. */
const MUSIC_SIGNAL_PATTERN =
  /\b(official audio|official video|lyrics|lyric video|audio only|provided to youtube|topic\s*[-–])/i;

export function isYouTubeClutter(title: string, durationMs?: number | null): boolean {
  const normalized = title.trim();
  if (!normalized) return true;
  if (CLUTTER_PATTERN.test(normalized)) return true;
  if (CLUTTER_SYMBOLS.test(normalized) && CLUTTER_PATTERN.test(normalized)) {
    return true;
  }
  // Very long uploads are rarely singles (podcasts, movies, reactions).
  if (durationMs != null && durationMs > 12 * 60 * 1000) return true;
  return false;
}

export function scoreYouTubeMusicSignal(title: string): number {
  if (MUSIC_SIGNAL_PATTERN.test(title)) return 0.35;
  if (/\b(audio|mv|music video)\b/i.test(title)) return 0.2;
  return 0;
}

export function filterYouTubeSearchResults(
  results: SearchResult[],
): SearchResult[] {
  return results.filter(
    (result) =>
      result.providerId !== "youtube" ||
      !isYouTubeClutter(result.title, result.durationMs),
  );
}

/** Build targeted YouTube queries from catalog metadata (Spotify / JioSaavn). */
export function buildYouTubeQueriesFromHints(
  hints: SearchResult[],
  userQuery: string,
): string[] {
  const queries: string[] = [];
  const seen = new Set<string>();

  for (const hint of hints) {
    const artist = hint.artists[0]?.name?.trim();
    const title = hint.title.trim();
    if (!title) continue;

    const candidates = artist
      ? [`${artist} ${title} official audio`, `${artist} - ${title} audio`]
      : [`${title} official audio`];

    for (const candidate of candidates) {
      const key = candidate.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      queries.push(candidate);
    }
  }

  const fallback = `${userQuery.trim()} official audio`;
  if (!seen.has(fallback.toLowerCase())) {
    queries.push(fallback);
  }

  return queries.slice(0, 3);
}

export function boostYouTubeMusicSignals(results: SearchResult[]): SearchResult[] {
  return results.map((result) => {
    if (result.providerId !== "youtube") return result;
    const boost = scoreYouTubeMusicSignal(result.title);
    if (boost === 0) return result;
    return {
      ...result,
      relevanceScore: Math.min(1, (result.relevanceScore ?? 0.5) + boost),
    };
  });
}
