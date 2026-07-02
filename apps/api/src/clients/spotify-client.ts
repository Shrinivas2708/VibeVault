import { env } from "@vibevault/config/server";
import { fetchJson, postJson } from "../lib/http-client";

export interface SpotifyTrack {
  id: string;
  provider: string;
  title: string;
  artists: Array<{ id: string | null; name: string }>;
  album: string | null;
  artwork_url: string | null;
  duration_ms: number | null;
  url: string;
}

export interface SpotifyPlaylist {
  id: string | null;
  name: string;
  description: string | null;
  artwork_url: string | null;
  track_count: number | null;
  owner: string | null;
  source_url: string;
  tracks: SpotifyTrack[];
}

export async function spotifySearch(
  query: string,
  limit: number,
): Promise<SpotifyTrack[]> {
  const result = await postJson<{ tracks: SpotifyTrack[] }>(
    `${env.SPOTIFY_URL}/search`,
    { query, limit },
  );
  return result.tracks;
}

export async function spotifyGetTrack(trackId: string): Promise<SpotifyTrack> {
  return fetchJson<SpotifyTrack>(
    `${env.SPOTIFY_URL}/tracks/${encodeURIComponent(trackId)}`,
  );
}

export async function spotifyImportPlaylist(
  url: string,
  maxTracks = 100,
): Promise<SpotifyPlaylist> {
  const endpoint = new URL("/playlists/import", env.SPOTIFY_URL);
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("max_tracks", String(maxTracks));
  return fetchJson<SpotifyPlaylist>(endpoint.toString());
}

export async function spotifyImportAlbum(
  url: string,
  maxTracks = 100,
): Promise<SpotifyPlaylist> {
  const endpoint = new URL("/albums/import", env.SPOTIFY_URL);
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("max_tracks", String(maxTracks));
  return fetchJson<SpotifyPlaylist>(endpoint.toString());
}

export async function spotifyImportTrack(url: string): Promise<SpotifyPlaylist> {
  const endpoint = new URL("/tracks/import", env.SPOTIFY_URL);
  endpoint.searchParams.set("url", url);
  return fetchJson<SpotifyPlaylist>(endpoint.toString());
}
