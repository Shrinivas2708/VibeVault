import { ERROR_CODES } from "@vibevault/config";
import type { SavedPlaylist } from "@vibevault/types";
import { AppError } from "../lib/errors";
import { providerRegistry } from "../providers";
import {
  findPlaylistByIdForUser,
  listPlaylistsByUser,
  upsertPlaylistBySourceUrl,
} from "../repositories/playlist-repository";

const SPOTIFY_PLAYLIST_URL =
  /^(https?:\/\/)?(open\.)?spotify\.com\/playlist\/[a-zA-Z0-9]+/i;

export function assertSpotifyPlaylistUrl(url: string): void {
  if (!SPOTIFY_PLAYLIST_URL.test(url.trim())) {
    throw new AppError(
      ERROR_CODES.VALIDATION_ERROR,
      "Only Spotify playlist URLs are supported",
      400,
    );
  }
}

export async function importSpotifyPlaylist(
  userId: string,
  url: string,
): Promise<SavedPlaylist> {
  assertSpotifyPlaylistUrl(url);

  const provider = providerRegistry.getOrThrow("spotify");
  const imported = await provider.importPlaylist(url.trim());

  return upsertPlaylistBySourceUrl({ userId, imported });
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
