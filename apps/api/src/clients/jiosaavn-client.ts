import { env } from "@vibevault/config/server";
import { pickBestImageUrl } from "@vibevault/utils";
import { fetchJson } from "../lib/http-client";

export interface JioSaavnSong {
  id: string;
  name: string;
  duration: number | null;
  url: string;
  image: Array<{ url: string; quality?: string }>;
  downloadUrl: Array<{ url: string; quality?: string }>;
  artists: {
    primary: Array<{ id: string; name: string }>;
    featured: Array<{ id: string; name: string }>;
    all: Array<{ id: string; name: string }>;
  };
  album: {
    id: string | null;
    name: string | null;
    url: string | null;
  };
  year: string | null;
}

export interface JioSaavnSearchSongs {
  results: JioSaavnSong[];
  total: number;
}

export interface JioSaavnPlaylist {
  id: string;
  name: string;
  description: string | null;
  url: string;
  image: Array<{ url: string }>;
  songCount: number;
  songs: JioSaavnSong[];
}

function buildUrl(path: string, params: Record<string, string | number>) {
  const url = new URL(path, env.JIOSAAVN_URL);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

export async function jiosaavnSearchSongs(
  query: string,
  page: number,
  limit: number,
): Promise<JioSaavnSearchSongs> {
  const response = await fetchJson<{
    success: boolean;
    data: JioSaavnSearchSongs;
  }>(buildUrl("/api/search/songs", { query, page: page - 1, limit }));

  return response.data;
}

export async function jiosaavnGetSong(id: string): Promise<JioSaavnSong> {
  const response = await fetchJson<{
    success: boolean;
    data: JioSaavnSong[];
  }>(buildUrl("/api/songs", { ids: id }));

  const song = response.data[0];
  if (!song) {
    throw new Error(`JioSaavn song not found: ${id}`);
  }
  return song;
}

export type JioSaavnAlbum = JioSaavnPlaylist;

export async function jiosaavnImportPlaylist(
  url: string,
  limit = 100,
): Promise<JioSaavnPlaylist> {
  const response = await fetchJson<{
    success: boolean;
    data: JioSaavnPlaylist;
  }>(buildUrl("/api/playlists", { link: url, page: 0, limit }));

  return response.data;
}

export async function jiosaavnImportAlbum(url: string): Promise<JioSaavnAlbum> {
  const response = await fetchJson<{
    success: boolean;
    data: JioSaavnAlbum;
  }>(buildUrl("/api/albums", { link: url }));

  return response.data;
}

export async function jiosaavnImportSongByLink(url: string): Promise<JioSaavnSong> {
  const response = await fetchJson<{
    success: boolean;
    data: JioSaavnSong[];
  }>(buildUrl("/api/songs", { link: url }));

  const song = response.data[0];
  if (!song) {
    throw new Error(`JioSaavn song not found: ${url}`);
  }
  return song;
}

export function pickBestDownloadUrl(
  urls: Array<{ url: string; quality?: string }>,
): string | null {
  if (!urls.length) return null;
  const sorted = [...urls].sort((a, b) => {
    const score = (quality?: string) => {
      if (!quality) return 0;
      if (quality.includes("320")) return 3;
      if (quality.includes("160")) return 2;
      return 1;
    };
    return score(b.quality) - score(a.quality);
  });
  return sorted[0]?.url ?? null;
}

export function pickBestImage(
  images: Array<{ url: string }>,
): string | undefined {
  return pickBestImageUrl(images);
}
