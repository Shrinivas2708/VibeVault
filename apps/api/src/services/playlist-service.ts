import { ERROR_CODES } from "@vibevault/config";
import type { ImportedPlaylist, ProviderId, SavedPlaylist } from "@vibevault/types";
import { AppError } from "../lib/errors";
import { providerRegistry } from "../providers";
import { sanitizeImportedPlaylist } from "../providers/mappers";
import {
  findPlaylistByIdForUser,
  listPlaylistsByUser,
  upsertPlaylistBySourceUrl,
} from "../repositories/playlist-repository";

const SPOTIFY_PLAYLIST_URL =
  /^(https?:\/\/)?(open\.)?spotify\.com\/playlist\/[a-zA-Z0-9]+/i;

const YOUTUBE_PLAYLIST_URL =
  /^(https?:\/\/)?(www\.|music\.)?youtube\.com\/playlist\?list=[\w-]+/i;

export function detectPlaylistProvider(url: string): ProviderId {
  const trimmed = url.trim();

  if (SPOTIFY_PLAYLIST_URL.test(trimmed)) {
    return "spotify";
  }

  if (YOUTUBE_PLAYLIST_URL.test(trimmed)) {
    return "youtube";
  }

  throw new AppError(
    ERROR_CODES.VALIDATION_ERROR,
    "Paste a public Spotify or YouTube playlist link",
    400,
  );
}

export async function importPlaylist(
  userId: string,
  url: string,
): Promise<SavedPlaylist> {
  const providerId = detectPlaylistProvider(url);
  const provider = providerRegistry.getOrThrow(providerId);
  const imported = sanitizeImportedPlaylist(
    await provider.importPlaylist(url.trim()),
  );

  if (imported.tracks.length === 0) {
    throw new AppError(
      ERROR_CODES.PROVIDER_ERROR,
      "No tracks could be imported from this playlist",
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

  return playlist;
}
