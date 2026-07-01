import type { StreamManifest } from "@vibevault/types";
import { API_URL } from "./config";

export function resolvePlaybackUrl(manifest: StreamManifest): string {
  if (/^https?:\/\//i.test(manifest.url)) {
    return manifest.url;
  }

  return `${API_URL}${manifest.url}`;
}
