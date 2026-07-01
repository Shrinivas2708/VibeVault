import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import {
  ImportPlaylistRequestSchema,
  SavedPlaylistSchema,
  SavedPlaylistSummarySchema,
} from "@vibevault/types";
import { jsonSuccess } from "../lib/response";
import { requireAuth } from "../middleware/request-id";
import * as playlistService from "../services/playlist-service";
import type { AppEnv } from "../types";

export const playlistRoutes = new Hono<AppEnv>();

playlistRoutes.use("*", requireAuth);

playlistRoutes.post(
  "/playlists/import",
  zValidator("json", ImportPlaylistRequestSchema),
  async (c) => {
    const { url } = c.req.valid("json");
    const userId = c.get("userId")!;
    const playlist = await playlistService.importPlaylist(userId, url);
    return jsonSuccess(c, SavedPlaylistSchema.parse(playlist), 201);
  },
);

playlistRoutes.get("/playlists", async (c) => {
  const userId = c.get("userId")!;
  const playlists = await playlistService.getUserPlaylists(userId);
  return jsonSuccess(
    c,
    z.array(SavedPlaylistSummarySchema).parse(playlists),
  );
});

playlistRoutes.get(
  "/playlists/:playlistId",
  zValidator(
    "param",
    z.object({
      playlistId: z.string().min(1),
    }),
  ),
  async (c) => {
    const userId = c.get("userId")!;
    const { playlistId } = c.req.valid("param");
    const playlist = await playlistService.getUserPlaylist(userId, playlistId);
    return jsonSuccess(c, SavedPlaylistSchema.parse(playlist));
  },
);
