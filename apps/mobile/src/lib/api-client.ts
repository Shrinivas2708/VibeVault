import {
  ApiErrorResponseSchema,
  AuthResponseSchema,
  type AuthResponse,
  type LoginRequest,
  type RegisterRequest,
  UserSchema,
  type User,
  apiSuccessSchema,
} from "@vibevault/types";
import { z } from "zod";
import { API_URL } from "./config";
import { tokenStorage } from "./storage";

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) return null;

  const response = await fetch(`${API_URL}/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      tokenStorage.clear();
    }
    return null;
  }

  const json = await response.json();
  const parsed = apiSuccessSchema(AuthResponseSchema).parse(json);
  tokenStorage.setSession(
    parsed.data.tokens.accessToken,
    parsed.data.tokens.refreshToken,
    JSON.stringify(parsed.data.user),
  );
  return parsed.data.tokens.accessToken;
}

async function getValidAccessToken(): Promise<string | null> {
  return tokenStorage.getAccessToken() ?? null;
}

async function ensureRefreshedToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  schema: z.ZodType<T>,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  const accessToken = await getValidAccessToken();
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  let response = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (response.status === 401 && accessToken) {
    const newToken = await ensureRefreshedToken();
    if (newToken) {
      headers.set("Authorization", `Bearer ${newToken}`);
      response = await fetch(`${API_URL}${path}`, { ...options, headers });
    }
  }

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    const errorResult = ApiErrorResponseSchema.safeParse(json);
    if (errorResult.success) {
      throw new ApiClientError(
        errorResult.data.error.message,
        errorResult.data.error.code,
        response.status,
      );
    }
    throw new ApiClientError("Request failed", "REQUEST_FAILED", response.status);
  }

  const parsed = apiSuccessSchema(schema).parse(json);
  return parsed.data;
}

export const authApi = {
  register: (body: RegisterRequest) =>
    apiRequest("/v1/auth/register", { method: "POST", body: JSON.stringify(body) }, AuthResponseSchema),

  login: (body: LoginRequest) =>
    apiRequest("/v1/auth/login", { method: "POST", body: JSON.stringify(body) }, AuthResponseSchema),

  me: () => apiRequest("/v1/auth/me", { method: "GET" }, UserSchema),

  logout: async () => {
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) return;

    try {
      await apiRequest(
        "/v1/auth/logout",
        { method: "POST", body: JSON.stringify({ refreshToken }) },
        z.object({ success: z.boolean() }),
      );
    } catch {
      // Clear local session even if server logout fails.
    }
  },
};
