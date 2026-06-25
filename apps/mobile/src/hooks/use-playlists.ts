import { useQuery } from "@tanstack/react-query";
import { playlistApi } from "@/lib/playlist-api";

export function usePlaylists() {
  return useQuery({
    queryKey: ["playlists"],
    queryFn: () => playlistApi.list(),
    staleTime: 30_000,
  });
}

export function usePlaylist(playlistId: string) {
  return useQuery({
    queryKey: ["playlists", playlistId],
    queryFn: () => playlistApi.get(playlistId),
    enabled: playlistId.length > 0,
    staleTime: 60_000,
  });
}
