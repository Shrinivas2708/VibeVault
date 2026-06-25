import { useMutation } from "@tanstack/react-query";
import type { SearchResult } from "@vibevault/types";
import * as Haptics from "expo-haptics";
import { ApiClientError } from "@/lib/api-client";
import { libraryApi } from "@/lib/library-api";
import { isNativePlaybackSupported } from "@/lib/platform";
import { musicApi } from "@/lib/music-api";
import { playerEngine } from "@/services/player-engine";
import {
  searchResultToTrack,
  usePlayerStore,
} from "@/stores/player-store";

export function usePlayTrack() {
  const setIsResolving = usePlayerStore((state) => state.setIsResolving);
  const setResolveError = usePlayerStore((state) => state.setResolveError);

  return useMutation({
    mutationFn: async (result: SearchResult) => {
      if (isNativePlaybackSupported) {
        await playerEngine.playSearchResult(result);
        return searchResultToTrack(result);
      }

      const track = searchResultToTrack(result);
      const manifest = await musicApi.resolveStream({ trackRef: track.ref });
      const enqueueTrack = usePlayerStore.getState().enqueueTrack;
      const setStreamManifest = usePlayerStore.getState().setStreamManifest;
      const setIsPlaying = usePlayerStore.getState().setIsPlaying;

      enqueueTrack(track);
      setStreamManifest(manifest);
      setIsPlaying(true);
      return track;
    },
    onMutate: () => {
      setIsResolving(true);
      setResolveError(null);
    },
    onSuccess: (track) => {
      setIsResolving(false);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      void libraryApi.recordHistory(track).catch(() => undefined);
    },
    onError: (error) => {
      setIsResolving(false);
      usePlayerStore.getState().setIsPlaying(false);

      if (error instanceof ApiClientError) {
        setResolveError(error.message);
        return;
      }

      setResolveError("Could not start playback. Try another track.");
    },
  });
}
