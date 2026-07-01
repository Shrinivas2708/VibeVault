import { ERROR_CODES } from "@vibevault/config";
import { env } from "@vibevault/config/server";
import { SignJWT, jwtVerify } from "jose";
import { AppError } from "./errors";

const encoder = new TextEncoder();
const secret = encoder.encode(env.JWT_SECRET);

const STREAM_TOKEN_TTL_SECONDS = 60 * 60;

export interface StreamTokenPayload {
  type: "stream";
  upstreamUrl: string;
  upstreamHeaders?: Record<string, string>;
  mimeType?: string;
}

export async function signStreamToken(
  payload: Omit<StreamTokenPayload, "type">,
): Promise<string> {
  return new SignJWT({
    type: "stream",
    upstreamUrl: payload.upstreamUrl,
    upstreamHeaders: payload.upstreamHeaders,
    mimeType: payload.mimeType,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${STREAM_TOKEN_TTL_SECONDS}s`)
    .sign(secret);
}

export async function verifyStreamToken(
  token: string,
): Promise<StreamTokenPayload> {
  try {
    const { payload } = await jwtVerify(token, secret);

    if (
      payload.type !== "stream" ||
      typeof payload.upstreamUrl !== "string" ||
      !payload.upstreamUrl
    ) {
      throw new AppError(ERROR_CODES.UNAUTHORIZED, "Invalid stream token", 401);
    }

    const upstreamHeaders =
      payload.upstreamHeaders &&
      typeof payload.upstreamHeaders === "object" &&
      !Array.isArray(payload.upstreamHeaders)
        ? Object.fromEntries(
            Object.entries(payload.upstreamHeaders).filter(
              ([, value]) => typeof value === "string",
            ),
          )
        : undefined;

    return {
      type: "stream",
      upstreamUrl: payload.upstreamUrl,
      upstreamHeaders,
      mimeType:
        typeof payload.mimeType === "string" ? payload.mimeType : undefined,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      ERROR_CODES.UNAUTHORIZED,
      "Invalid or expired stream token",
      401,
    );
  }
}
