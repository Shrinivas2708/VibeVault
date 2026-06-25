import type { SearchResult, TrackMetadata } from "@vibevault/types";

export function trackToSearchResult(track: TrackMetadata): SearchResult {
  return {
    ...track,
    providerId: track.ref.providerId,
  };
}
