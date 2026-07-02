import type {
  DownloadManifest,
  DownloadOptions,
  ImportedPlaylist,
  ProviderId,
  SearchQuery,
  SearchResult,
  SearchResultPage,
  StreamManifest,
  StreamOptions,
  TrackMetadata,
  TrackRef,
} from "@vibevault/types";
import { buildPaginationMeta } from "@vibevault/utils";
import type { ExtractorPlaylist, ExtractorTrack } from "../clients/extractor-client";
import type { JioSaavnPlaylist, JioSaavnSong } from "../clients/jiosaavn-client";
import {
  pickBestDownloadUrl,
  pickBestImage,
} from "../clients/jiosaavn-client";
import type { SpotifyPlaylist, SpotifyTrack } from "../clients/spotify-client";

export function toTrackRef(
  providerId: ProviderId,
  externalId: string,
  url?: string,
): TrackRef {
  return { providerId, externalId, url };
}

function nullToUndefined<T>(value: T | null | undefined): T | undefined {
  return value === null ? undefined : value;
}

export function sanitizeTrackMetadata(
  track: TrackMetadata,
): TrackMetadata | null {
  const externalId = track.ref.externalId?.trim();
  if (!externalId) {
    return null;
  }

  return {
    ...track,
    ref: {
      ...track.ref,
      externalId,
      url: nullToUndefined(track.ref.url),
    },
    title: track.title.trim() || "Unknown Title",
    artists: track.artists
      .filter((artist) => artist.name?.trim())
      .map((artist) => ({
        name: artist.name.trim(),
        ...(artist.id ? { id: artist.id } : {}),
      })),
    album: track.album
      ? {
          ...track.album,
          artworkUrl: nullToUndefined(track.album.artworkUrl),
        }
      : undefined,
    artworkUrl: nullToUndefined(track.artworkUrl),
    durationMs: nullToUndefined(track.durationMs),
    releaseYear: nullToUndefined(track.releaseYear),
  };
}

export function sanitizeImportedPlaylist(
  playlist: ImportedPlaylist,
): ImportedPlaylist {
  const tracks = playlist.tracks
    .map(sanitizeTrackMetadata)
    .filter((track): track is TrackMetadata => track !== null);

  return {
    ...playlist,
    artworkUrl: nullToUndefined(playlist.artworkUrl),
    description: nullToUndefined(playlist.description),
    owner: nullToUndefined(playlist.owner),
    trackCount: tracks.length,
    tracks,
  };
}

export function extractorToMetadata(track: ExtractorTrack): TrackMetadata {
  return {
    ref: toTrackRef("youtube", track.id, track.url),
    title: track.title,
    artists: track.artists.map((a) => ({ id: a.id ?? undefined, name: a.name })),
    album: track.album?.name
      ? {
          id: track.album.id ?? undefined,
          name: track.album.name,
          artworkUrl: track.album.artwork_url ?? undefined,
        }
      : undefined,
    artworkUrl: track.artwork_url ?? undefined,
    durationMs: track.duration_ms ?? undefined,
    isVideo: track.is_video,
    releaseYear: undefined,
  };
}

export function extractorToSearchResult(track: ExtractorTrack): SearchResult {
  return {
    ...extractorToMetadata(track),
    providerId: "youtube",
  };
}

export function jiosaavnToMetadata(song: JioSaavnSong): TrackMetadata {
  const artists =
    song.artists?.all?.length > 0
      ? song.artists.all
      : song.artists?.primary ?? [];

  return {
    ref: toTrackRef("jiosaavn", song.id, song.url),
    title: song.name,
    artists: artists.map((a) => ({ id: a.id, name: a.name })),
    album: song.album?.name
      ? {
          id: song.album.id ?? undefined,
          name: song.album.name,
          artworkUrl: undefined,
        }
      : undefined,
    artworkUrl: pickBestImage(song.image),
    durationMs: song.duration ? song.duration * 1000 : undefined,
    isVideo: false,
    releaseYear: song.year ? Number.parseInt(song.year, 10) : undefined,
  };
}

export function jiosaavnToSearchResult(song: JioSaavnSong): SearchResult {
  return {
    ...jiosaavnToMetadata(song),
    providerId: "jiosaavn",
  };
}

export function spotifyToMetadata(track: SpotifyTrack): TrackMetadata {
  return {
    ref: toTrackRef("spotify", track.id, track.url),
    title: track.title,
    artists: track.artists.map((a) => ({
      id: a.id ?? undefined,
      name: a.name,
    })),
    album: track.album
      ? { name: track.album, artworkUrl: track.artwork_url ?? undefined }
      : undefined,
    artworkUrl: track.artwork_url ?? undefined,
    durationMs: track.duration_ms ?? undefined,
    isVideo: false,
  };
}

export function spotifyToSearchResult(track: SpotifyTrack): SearchResult {
  return {
    ...spotifyToMetadata(track),
    providerId: "spotify",
  };
}

export function buildSearchPage(
  providerId: ProviderId,
  query: SearchQuery,
  results: SearchResult[],
  total?: number,
): SearchResultPage {
  return {
    results,
    meta: buildPaginationMeta(query.page, query.limit, results.length, total),
    providersQueried: [providerId],
    providersFailed: [],
  };
}

export function extractorToPlaylist(data: ExtractorPlaylist): ImportedPlaylist {
  return sanitizeImportedPlaylist({
    id: data.id ?? undefined,
    name: data.name,
    description: data.description ?? undefined,
    artworkUrl: data.artwork_url ?? undefined,
    trackCount: data.track_count ?? data.tracks.length,
    owner: data.owner ?? undefined,
    sourceUrl: data.source_url,
    sourceProviderId: "youtube",
    tracks: data.tracks.map(extractorToMetadata),
  });
}

export function jiosaavnToPlaylist(data: JioSaavnPlaylist): ImportedPlaylist {
  return sanitizeImportedPlaylist({
    id: data.id,
    name: data.name,
    description: data.description ?? undefined,
    artworkUrl: pickBestImage(data.image),
    trackCount: data.songCount,
    sourceUrl: data.url,
    sourceProviderId: "jiosaavn",
    tracks: (data.songs ?? []).map(jiosaavnToMetadata),
  });
}

export function jiosaavnToAlbum(data: JioSaavnPlaylist): ImportedPlaylist {
  return jiosaavnToPlaylist(data);
}

export function trackToImportedPlaylist(
  track: TrackMetadata,
  sourceUrl: string,
  providerId: ProviderId,
): ImportedPlaylist {
  return sanitizeImportedPlaylist({
    id: track.ref.externalId,
    name: track.title,
    artworkUrl: track.artworkUrl ?? track.album?.artworkUrl,
    trackCount: 1,
    sourceUrl,
    sourceProviderId: providerId,
    tracks: [track],
  });
}

export function spotifyToPlaylist(data: SpotifyPlaylist): ImportedPlaylist {
  return sanitizeImportedPlaylist({
    id: data.id ?? undefined,
    name: data.name,
    description: data.description ?? undefined,
    artworkUrl: data.artwork_url ?? undefined,
    trackCount: data.track_count ?? data.tracks.length,
    owner: data.owner ?? undefined,
    sourceUrl: data.source_url,
    sourceProviderId: "spotify",
    tracks: data.tracks.map(spotifyToMetadata),
  });
}

export function jiosaavnStreamManifest(
  ref: TrackRef,
  song: JioSaavnSong,
): StreamManifest {
  const url = pickBestDownloadUrl(song.downloadUrl);
  if (!url) {
    throw new Error("No stream URL available for JioSaavn track");
  }

  return {
    trackRef: ref,
    deliveryMode: "direct",
    url,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    isVideo: false,
  };
}

export function jiosaavnDownloadManifest(
  ref: TrackRef,
  song: JioSaavnSong,
  options?: DownloadOptions,
): DownloadManifest {
  const url = pickBestDownloadUrl(song.downloadUrl);
  if (!url) {
    throw new Error("No download URL available for JioSaavn track");
  }

  const ext = options?.format === "best" ? "mp3" : (options?.format ?? "mp3");

  return {
    trackRef: ref,
    url,
    filename: `${song.name}.${ext}`,
    format: ext,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  };
}
