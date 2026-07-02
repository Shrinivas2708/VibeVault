import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import {
  AddFavoriteRequestSchema,
  FavoriteSchema,
  HistoryEntrySchema,
  HistoryQuerySchema,
  ProviderIdSchema,
  RecordHistoryRequestSchema,
} from "@vibevault/types";
import { jsonSuccess } from "../lib/response";
import { requireAuth } from "../middleware/request-id";
import * as libraryService from "../services/library-service";
import type { AppEnv } from "../types";

export const libraryRoutes = new Hono<AppEnv>();

libraryRoutes.use("*", requireAuth);

libraryRoutes.get("/library/favorites", async (c) => {
  const userId = c.get("userId")!;
  const favorites = await libraryService.getFavorites(userId);
  return jsonSuccess(c, z.array(FavoriteSchema).parse(favorites));
});

libraryRoutes.post(
  "/library/favorites",
  zValidator("json", AddFavoriteRequestSchema),
  async (c) => {
    const userId = c.get("userId")!;
    const { track } = c.req.valid("json");
    const favorite = await libraryService.addFavorite(userId, track);
    return jsonSuccess(c, FavoriteSchema.parse(favorite), 201);
  },
);

libraryRoutes.delete(
  "/library/favorites/:providerId/:externalId",
  zValidator(
    "param",
    z.object({
      providerId: ProviderIdSchema,
      externalId: z.string().min(1),
    }),
  ),
  async (c) => {
    const userId = c.get("userId")!;
    const { providerId, externalId } = c.req.valid("param");
    const result = await libraryService.removeFavorite(
      userId,
      providerId,
      externalId,
    );
    return jsonSuccess(c, result);
  },
);

libraryRoutes.get(
  "/library/history",
  zValidator("query", HistoryQuerySchema),
  async (c) => {
    const userId = c.get("userId")!;
    const { limit } = c.req.valid("query");
    const entries = await libraryService.getHistory(userId, limit);
    return jsonSuccess(c, z.array(HistoryEntrySchema).parse(entries));
  },
);

libraryRoutes.post(
  "/library/history",
  zValidator("json", RecordHistoryRequestSchema),
  async (c) => {
    const userId = c.get("userId")!;
    const body = c.req.valid("json");
    const entry = await libraryService.recordHistory(
      userId,
      body.track,
      body.durationPlayedMs,
    );
    return jsonSuccess(c, HistoryEntrySchema.parse(entry), 201);
  },
);

libraryRoutes.delete("/library/history", async (c) => {
  const userId = c.get("userId")!;
  const result = await libraryService.clearHistory(userId);
  return jsonSuccess(
    c,
    z.object({ success: z.boolean(), deletedCount: z.number() }).parse(result),
  );
});
