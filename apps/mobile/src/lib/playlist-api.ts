import {
  ImportPlaylistRequestSchema,
  SavedPlaylistSchema,
  SavedPlaylistSummarySchema,
  type SavedPlaylist,
  type SavedPlaylistSummary,
} from "@vibevault/types";
import { z } from "zod";
import { apiRequest } from "./api-client";

export const playlistApi = {
  list: () =>
    apiRequest(
      "/v1/playlists",
      { method: "GET" },
      z.array(SavedPlaylistSummarySchema),
    ),

  get: (playlistId: string) =>
    apiRequest(
      `/v1/playlists/${encodeURIComponent(playlistId)}`,
      { method: "GET" },
      SavedPlaylistSchema,
    ),

  importPlaylist: (url: string) =>
    apiRequest(
      "/v1/playlists/import",
      {
        method: "POST",
        body: JSON.stringify(ImportPlaylistRequestSchema.parse({ url })),
      },
      SavedPlaylistSchema,
    ),
};

export type { SavedPlaylist, SavedPlaylistSummary };
