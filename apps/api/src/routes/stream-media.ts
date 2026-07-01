import { ERROR_CODES } from "@vibevault/config";
import { Hono } from "hono";
import { AppError } from "../lib/errors";
import { verifyStreamToken } from "../lib/stream-token";
import type { AppEnv } from "../types";

const PASSTHROUGH_HEADERS = [
  "content-type",
  "content-length",
  "accept-ranges",
  "content-range",
] as const;

export const streamMediaRoutes = new Hono<AppEnv>();

streamMediaRoutes.get("/stream/media", async (c) => {
  const token = c.req.query("token");
  if (!token) {
    throw new AppError(ERROR_CODES.UNAUTHORIZED, "Missing stream token", 401);
  }

  const payload = await verifyStreamToken(token);
  const upstreamHeaders: Record<string, string> = {
    ...payload.upstreamHeaders,
  };

  const range = c.req.header("range");
  if (range) {
    upstreamHeaders.Range = range;
  }

  const upstream = await fetch(payload.upstreamUrl, { headers: upstreamHeaders });

  if (!upstream.ok && upstream.status !== 206) {
    throw new AppError(
      ERROR_CODES.PROVIDER_ERROR,
      "Upstream stream unavailable",
      502,
    );
  }

  const responseHeaders = new Headers();
  for (const header of PASSTHROUGH_HEADERS) {
    const value = upstream.headers.get(header);
    if (value) {
      responseHeaders.set(header, value);
    }
  }

  if (!responseHeaders.has("content-type") && payload.mimeType) {
    responseHeaders.set("content-type", payload.mimeType);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
});
