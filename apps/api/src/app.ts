import { Hono } from "hono";
import { cors } from "hono/cors";
import { ERROR_CODES } from "@vibevault/config";
import { env } from "@vibevault/config/server";
import { jsonError } from "./lib/response";
import { errorHandler } from "./middleware/error-handler";
import { requestIdMiddleware } from "./middleware/request-id";
import { authRoutes } from "./routes/auth";
import { healthRoutes } from "./routes/health";
import { internalRoutes } from "./routes/internal";
import { musicRoutes } from "./routes/music";
import { playlistRoutes } from "./routes/playlists";
import type { AppEnv } from "./types";

export function createApp() {
  const app = new Hono<AppEnv>();

  app.use("*", cors());
  app.use("*", requestIdMiddleware);
  app.onError(errorHandler);

  app.route("/", healthRoutes);
  app.route("/v1/auth", authRoutes);
  app.route("/v1", musicRoutes);
  app.route("/v1", playlistRoutes);

  if (env.NODE_ENV !== "production") {
    app.route("/v1/internal", internalRoutes);
  }

  app.notFound((c) =>
    jsonError(c, ERROR_CODES.NOT_FOUND, "Route not found", 404),
  );

  return app;
}
