import { ERROR_CODES } from "@vibevault/config";
import type { Favorite, HistoryEntry, TrackMetadata } from "@vibevault/types";
import { AppError } from "../lib/errors";
import * as libraryRepository from "../repositories/library-repository";

export async function getFavorites(userId: string) {
  return libraryRepository.listFavorites(userId);
}

export async function addFavorite(userId: string, track: TrackMetadata) {
  return libraryRepository.addFavorite(userId, track);
}

export async function removeFavorite(
  userId: string,
  providerId: string,
  externalId: string,
) {
  const removed = await libraryRepository.removeFavorite(
    userId,
    providerId,
    externalId,
  );

  if (!removed) {
    throw new AppError(ERROR_CODES.NOT_FOUND, "Favorite not found", 404);
  }

  return { success: true };
}

export async function getHistory(userId: string, limit: number) {
  return libraryRepository.listHistory(userId, limit);
}

export async function recordHistory(
  userId: string,
  track: TrackMetadata,
  durationPlayedMs?: number,
): Promise<HistoryEntry> {
  return libraryRepository.recordHistory(userId, track, durationPlayedMs);
}

export async function clearHistory(userId: string) {
  const deletedCount = await libraryRepository.clearHistory(userId);
  return { success: true, deletedCount };
}
