import type { StreamManifest, TrackMetadata } from "@vibevault/types";
import type { AddTrack } from "react-native-track-player";
import { resolvePlaybackUrl } from "@/lib/playback-url";
import { manifestCache, manifestCacheKey } from "@/lib/manifest-cache";

export function trackKey(track: TrackMetadata) {
  return manifestCacheKey(track.ref.providerId, track.ref.externalId);
}

export type PlaybackSource =
  | { kind: "local"; fileUri: string }
  | { kind: "stream"; manifest: StreamManifest };

export function toPlayerTrack(
  track: TrackMetadata,
  source: PlaybackSource,
): AddTrack {
  const url =
    source.kind === "local"
      ? source.fileUri
      : resolvePlaybackUrl(source.manifest);
  const headers =
    source.kind === "stream" && source.manifest.deliveryMode === "direct"
      ? source.manifest.headers
      : undefined;
  const contentType =
    source.kind === "stream" ? source.manifest.mimeType : undefined;

  return {
    id: trackKey(track),
    url,
    title: track.title,
    artist: track.artists.map((artist) => artist.name).join(", "),
    album: track.album?.name,
    artwork: track.artworkUrl,
    duration: track.durationMs ? track.durationMs / 1000 : undefined,
    headers,
    contentType,
  };
}

export function isLocalPlaybackSource(source: PlaybackSource) {
  return source.kind === "local";
}
