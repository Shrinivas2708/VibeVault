import type { TrackMetadata } from "@vibevault/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { libraryApi } from "@/lib/library-api";
import { trackKey } from "@/services/player-helpers";

const FAVORITES_KEY = ["library", "favorites"] as const;

export function useFavorites() {
  return useQuery({
    queryKey: FAVORITES_KEY,
    queryFn: () => libraryApi.listFavorites(),
    staleTime: 30_000,
  });
}

export function useFavoriteIds() {
  const { data } = useFavorites();
  return new Set((data ?? []).map((favorite) => trackKey(favorite.track)));
}

export function useIsFavorite(track: TrackMetadata) {
  const { data } = useFavorites();
  const key = trackKey(track);
  return (data ?? []).some((favorite) => trackKey(favorite.track) === key);
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      track,
      isFavorite,
    }: {
      track: TrackMetadata;
      isFavorite: boolean;
    }) => {
      if (isFavorite) {
        await libraryApi.removeFavorite(track.ref.providerId, track.ref.externalId);
        return false;
      }

      await libraryApi.addFavorite(track);
      return true;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: FAVORITES_KEY });
    },
  });
}
