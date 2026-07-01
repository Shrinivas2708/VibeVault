import { useEffect } from "react";
import { resolvePlaybackUrl } from "@/lib/playback-url";
import { playerEngine } from "@/services/player-engine";
import { webAudioPlayer } from "@/services/web-audio-player";
import { usePlayerStore } from "@/stores/player-store";
import { showToast } from "@/stores/toast-store";

export function PlayerSync() {
  const streamManifest = usePlayerStore((state) => state.streamManifest);
  const isPlaying = usePlayerStore((state) => state.isPlaying);

  useEffect(() => {
    webAudioPlayer.setListeners({
      onTimeUpdate: (position, duration) => {
        usePlayerStore.getState().setProgress(position, duration);
      },
      onEnded: () => {
        void playerEngine.handleQueueEnded();
      },
      onError: (message) => {
        usePlayerStore.getState().setIsPlaying(false);
        usePlayerStore.getState().setResolveError(message);
        showToast(message);
      },
    });
  }, []);

  useEffect(() => {
    if (!streamManifest?.url) return;
    webAudioPlayer.load(resolvePlaybackUrl(streamManifest));
  }, [streamManifest?.url]);

  useEffect(() => {
    if (!streamManifest?.url) return;

    if (isPlaying) {
      void webAudioPlayer.play().catch(() => {
        const message = "Playback blocked or stream unavailable.";
        usePlayerStore.getState().setIsPlaying(false);
        usePlayerStore.getState().setResolveError(message);
        showToast(message);
      });
      return;
    }

    webAudioPlayer.pause();
  }, [isPlaying, streamManifest?.url]);

  return null;
}
