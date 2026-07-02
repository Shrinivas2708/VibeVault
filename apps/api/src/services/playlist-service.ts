import { ERROR_CODES } from "@vibevault/config";
import type { ImportedPlaylist, ProviderId, SavedPlaylist } from "@vibevault/types";
import {
  extractorMetadata,
  extractorPlaylist,
} from "../clients/extractor-client";
import {
  jiosaavnImportAlbum,
  jiosaavnImportPlaylist,
  jiosaavnImportSongByLink,
} from "../clients/jiosaavn-client";
import {
  spotifyImportAlbum,
  spotifyImportPlaylist,
  spotifyImportTrack,
} from "../clients/spotify-client";
import { AppError } from "../lib/errors";
import { detectImportTarget, type ImportKind } from "../lib/import-url";
import { providerRegistry } from "../providers";
import {
  extractorToMetadata,
  extractorToPlaylist,
  jiosaavnToAlbum,
  jiosaavnToMetadata,
  jiosaavnToPlaylist,
  sanitizeImportedPlaylist,
  spotifyToPlaylist,
  trackToImportedPlaylist,
} from "../providers/mappers";
import {
  findPlaylistByIdForUser,
  listPlaylistsByUser,
  updatePlaylistTracksForUser,
  upsertPlaylistBySourceUrl,
} from "../repositories/playlist-repository";
import { enrichSpotifyPlaylistArtwork } from "./playlist-artwork-service";

export { detectImportTarget, detectPlaylistProvider } from "../lib/import-url";

async function fetchImportedCollection(
  providerId: ProviderId,
  kind: ImportKind,
  url: string,
): Promise<ImportedPlaylist> {
  const trimmed = url.trim();

  if (providerId === "spotify") {
    if (kind === "playlist") {
      return spotifyToPlaylist(await spotifyImportPlaylist(trimmed));
    }
    if (kind === "album") {
      return spotifyToPlaylist(await spotifyImportAlbum(trimmed));
    }
    return spotifyToPlaylist(await spotifyImportTrack(trimmed));
  }

  if (providerId === "youtube") {
    if (kind === "playlist") {
      return extractorToPlaylist(await extractorPlaylist(trimmed));
    }
    const track = extractorToMetadata(await extractorMetadata(trimmed));
    return trackToImportedPlaylist(track, trimmed, "youtube");
  }

  if (providerId === "jiosaavn") {
    if (kind === "playlist") {
      return jiosaavnToPlaylist(await jiosaavnImportPlaylist(trimmed));
    }
    if (kind === "album") {
      return jiosaavnToAlbum(await jiosaavnImportAlbum(trimmed));
    }
    const song = await jiosaavnImportSongByLink(trimmed);
    return trackToImportedPlaylist(jiosaavnToMetadata(song), trimmed, "jiosaavn");
  }

  const provider = providerRegistry.getOrThrow(providerId);
  return sanitizeImportedPlaylist(await provider.importPlaylist(trimmed));
}

export async function importPlaylist(
  userId: string,
  url: string,
): Promise<SavedPlaylist> {
  const { providerId, kind } = detectImportTarget(url);
  const imported = sanitizeImportedPlaylist(
    await fetchImportedCollection(providerId, kind, url),
  );

  if (imported.tracks.length === 0) {
    const label =
      kind === "track" ? "track" : kind === "album" ? "album" : "playlist";
    throw new AppError(
      ERROR_CODES.PROVIDER_ERROR,
      `No tracks could be imported from this ${label}`,
      502,
    );
  }

  return upsertPlaylistBySourceUrl({ userId, imported });
}

/** @deprecated Use importPlaylist */
export async function importSpotifyPlaylist(
  userId: string,
  url: string,
): Promise<SavedPlaylist> {
  return importPlaylist(userId, url);
}

export async function getUserPlaylists(userId: string) {
  return listPlaylistsByUser(userId);
}

export async function getUserPlaylist(userId: string, playlistId: string) {
  const playlist = await findPlaylistByIdForUser(userId, playlistId);

  if (!playlist) {
    throw new AppError(ERROR_CODES.NOT_FOUND, "Playlist not found", 404);
  }

  const { playlist: enriched, changed } =
    await enrichSpotifyPlaylistArtwork(playlist);

  if (!changed) {
    return playlist;
  }

  const updated = await updatePlaylistTracksForUser({
    userId,
    playlistId,
    tracks: enriched.tracks,
    artworkUrl: enriched.artworkUrl,
  });

  return updated ?? enriched;
}
