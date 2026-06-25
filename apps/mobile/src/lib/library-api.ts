import {
  AddFavoriteRequestSchema,
  FavoriteSchema,
  HistoryEntrySchema,
  RecordHistoryRequestSchema,
  type Favorite,
  type HistoryEntry,
  type TrackMetadata,
} from "@vibevault/types";
import { z } from "zod";
import { apiRequest } from "./api-client";

export const libraryApi = {
  listFavorites: () =>
    apiRequest("/v1/library/favorites", { method: "GET" }, z.array(FavoriteSchema)),

  addFavorite: (track: TrackMetadata) =>
    apiRequest(
      "/v1/library/favorites",
      {
        method: "POST",
        body: JSON.stringify(AddFavoriteRequestSchema.parse({ track })),
      },
      FavoriteSchema,
    ),

  removeFavorite: (providerId: string, externalId: string) =>
    apiRequest(
      `/v1/library/favorites/${encodeURIComponent(providerId)}/${encodeURIComponent(externalId)}`,
      { method: "DELETE" },
      z.object({ success: z.boolean() }),
    ),

  listHistory: (limit = 50) =>
    apiRequest(
      `/v1/library/history?limit=${limit}`,
      { method: "GET" },
      z.array(HistoryEntrySchema),
    ),

  recordHistory: (track: TrackMetadata, durationPlayedMs?: number) =>
    apiRequest(
      "/v1/library/history",
      {
        method: "POST",
        body: JSON.stringify(
          RecordHistoryRequestSchema.parse({ track, durationPlayedMs }),
        ),
      },
      HistoryEntrySchema,
    ),
};

export type { Favorite, HistoryEntry };
