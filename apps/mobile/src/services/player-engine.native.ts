import type { SearchResult, TrackMetadata } from "@vibevault/types";
import * as FileSystem from "expo-file-system/legacy";
import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  Event,
  State,
} from "react-native-track-player";
import { getErrorMessage } from "@/lib/error-message";
import { downloadManager } from "@/services/download-manager";
import {
  beginPlaybackTransition,
  isActivePlaybackGeneration,
  prepareTrackTransition,
  removeTrackAndSkippedFromQueue,
} from "@/services/playback-core";
import {
  searchResultToTrack,
  usePlayerStore,
} from "@/stores/player-store";
import { showToast } from "@/stores/toast-store";
import {
  isLocalPlaybackSource,
  toPlayerTrack,
  trackKey,
  type PlaybackSource,
} from "./player-helpers";
import { manifestCache } from "@/lib/manifest-cache";
import { musicApi } from "@/lib/music-api";
import { isStreamExpired } from "@vibevault/utils";

let setupPromise: Promise<void> | null = null;

async function resolvePlaybackSource(
  track: TrackMetadata,
): Promise<PlaybackSource> {
  const key = trackKey(track);
  const local = downloadManager.getLocalRecord(key);

  if (local) {
    const info = await FileSystem.getInfoAsync(local.localPath);
    if (info.exists) {
      return { kind: "local", fileUri: local.fileUri };
    }
  }

  const cached = manifestCache.get(key);
  let manifest = cached && !isStreamExpired(cached.expiresAt) ? cached : null;

  if (!manifest) {
    manifest = await musicApi.resolveStream({ trackRef: track.ref });
    manifestCache.set(key, manifest);
  }

  return { kind: "stream", manifest };
}

let queueAdvanceInFlight = false;
let lastQueueAdvanceAt = 0;

async function startNativePlayback(
  playable: TrackMetadata,
  manifest: PlaybackSource,
) {
  const playerTrack = toPlayerTrack(playable, manifest);

  await TrackPlayer.reset();
  await TrackPlayer.setQueue([playerTrack]);
  await TrackPlayer.play();

  usePlayerStore.setState({
    currentTrack: playable,
    streamManifest: manifest.kind === "stream" ? manifest.manifest : null,
    isLocalPlayback: isLocalPlaybackSource(manifest),
    isPlaying: true,
    resolveError: null,
  });
}

async function transitionToTrack(
  track: TrackMetadata,
  token: number,
  options: { syncQueue: boolean },
) {
  await playerEngine.ensureSetup();
  usePlayerStore.setState({ isResolving: true, resolveError: null });

  try {
    await TrackPlayer.pause();
    const prepared = await prepareTrackTransition(track, token);
    if (!prepared) return;

    if (options.syncQueue) {
      removeTrackAndSkippedFromQueue(track);
    }

    const source = await resolvePlaybackSource(prepared.playable);
    if (!isActivePlaybackGeneration(token)) return;

    await startNativePlayback(prepared.playable, source);
  } catch (error) {
    if (!isActivePlaybackGeneration(token)) return;

    const message = getErrorMessage(error, "Could not start playback.");
    usePlayerStore.getState().setIsPlaying(false);
    usePlayerStore.getState().setResolveError(message);
    showToast(message);
  } finally {
    if (isActivePlaybackGeneration(token)) {
      usePlayerStore.getState().setIsResolving(false);
    }
  }
}

export const playerEngine = {
  async ensureSetup() {
    if (!setupPromise) {
      setupPromise = (async () => {
        await TrackPlayer.setupPlayer({
          autoHandleInterruptions: true,
        });

        await TrackPlayer.updateOptions({
          android: {
            appKilledPlaybackBehavior:
              AppKilledPlaybackBehavior.ContinuePlayback,
            alwaysPauseOnInterruption: true,
          },
          capabilities: [
            Capability.Play,
            Capability.Pause,
            Capability.SkipToNext,
            Capability.SkipToPrevious,
            Capability.SeekTo,
          ],
          compactCapabilities: [
            Capability.Play,
            Capability.Pause,
            Capability.SkipToNext,
          ],
          notificationCapabilities: [
            Capability.Play,
            Capability.Pause,
            Capability.SkipToNext,
            Capability.SkipToPrevious,
            Capability.SeekTo,
          ],
          progressUpdateEventInterval: 1,
        });
      })();
    }

    return setupPromise;
  },

  async playSearchResult(result: SearchResult) {
    const token = beginPlaybackTransition();
    await transitionToTrack(searchResultToTrack(result), token, {
      syncQueue: false,
    });
  },

  async addToQueue(result: SearchResult) {
    const added = usePlayerStore.getState().addToQueue(searchResultToTrack(result));
    if (added) {
      showToast("Added to queue");
      return;
    }

    showToast("Already playing or queued");
  },

  async skipToNext() {
    const queue = usePlayerStore.getState().queue;
    if (queue.length === 0) return;

    const token = beginPlaybackTransition();
    await transitionToTrack(queue[0]!, token, { syncQueue: true });
  },

  async skipToPrevious() {
    await this.ensureSetup();
    await TrackPlayer.seekTo(0);
    usePlayerStore.getState().setProgress(0, usePlayerStore.getState().duration);
  },

  async playQueueIndex(index: number) {
    const queue = usePlayerStore.getState().queue;
    const track = queue[index];
    if (!track) return;

    const token = beginPlaybackTransition();
    await transitionToTrack(track, token, { syncQueue: true });
  },

  async play() {
    await TrackPlayer.play();
    usePlayerStore.getState().setIsPlaying(true);
  },

  async pause() {
    await TrackPlayer.pause();
    usePlayerStore.getState().setIsPlaying(false);
  },

  async seekTo(position: number) {
    await TrackPlayer.seekTo(position);
  },

  async refreshExpiredStreamIfNeeded() {
    const { streamManifest, currentTrack, isPlaying, isLocalPlayback } =
      usePlayerStore.getState();

    if (isLocalPlayback || !streamManifest || !currentTrack || !isPlaying) {
      return;
    }

    if (!isStreamExpired(streamManifest.expiresAt)) {
      return;
    }

    const index = await TrackPlayer.getActiveTrackIndex();
    if (index === undefined) {
      return;
    }

    const progress = await TrackPlayer.getProgress();
    const source = await resolvePlaybackSource(currentTrack);

    if (source.kind === "local") {
      usePlayerStore.setState({ isLocalPlayback: true, streamManifest: null });
      return;
    }

    const playerTrack = toPlayerTrack(currentTrack, source);

    await TrackPlayer.pause();
    await TrackPlayer.reset();
    await TrackPlayer.setQueue([playerTrack]);
    await TrackPlayer.skip(0, progress.position);
    await TrackPlayer.play();

    usePlayerStore.getState().setStreamManifest(source.manifest);
  },

  async handleQueueEnded() {
    const now = Date.now();
    if (queueAdvanceInFlight || now - lastQueueAdvanceAt < 1000) {
      return;
    }

    const queue = usePlayerStore.getState().queue;
    if (queue.length === 0) {
      usePlayerStore.getState().setIsPlaying(false);
      return;
    }

    queueAdvanceInFlight = true;
    lastQueueAdvanceAt = now;

    try {
      await this.skipToNext();
    } finally {
      queueAdvanceInFlight = false;
    }
  },

  syncPlaybackState(state: State | undefined) {
    if (!state) {
      return;
    }

    const isPlaying =
      state === State.Playing ||
      state === State.Buffering ||
      state === State.Loading;

    usePlayerStore.getState().setIsPlaying(isPlaying);
  },
};

export { Event, State };
