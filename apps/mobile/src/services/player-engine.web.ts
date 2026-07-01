import type { SearchResult, TrackMetadata } from "@vibevault/types";
import { isStreamExpired } from "@vibevault/utils";
import { manifestCache } from "@/lib/manifest-cache";
import { musicApi } from "@/lib/music-api";
import {
  searchResultToTrack,
  usePlayerStore,
} from "@/stores/player-store";
import { trackKey } from "./player-helpers";
import { webAudioPlayer } from "./web-audio-player";

async function resolveStreamManifest(track: TrackMetadata) {
  const key = trackKey(track);
  const cached = manifestCache.get(key);

  if (cached && !isStreamExpired(cached.expiresAt)) {
    return cached;
  }

  const manifest = await musicApi.resolveStream({ trackRef: track.ref });
  manifestCache.set(key, manifest);
  return manifest;
}

async function playTrackAtIndex(index: number) {
  const queue = usePlayerStore.getState().queue;
  const track = queue[index];

  if (!track) return;

  const manifest = await resolveStreamManifest(track);

  usePlayerStore.setState({
    currentIndex: index,
    currentTrack: track,
    streamManifest: manifest,
    isPlaying: true,
    resolveError: null,
    position: 0,
    duration: track.durationMs ? track.durationMs / 1000 : 0,
  });
}

export const playerEngine = {
  async ensureSetup() {},

  async playSearchResult(result: SearchResult) {
    const track = searchResultToTrack(result);
    const key = trackKey(track);
    const state = usePlayerStore.getState();
    const existingIndex = state.queue.findIndex((item) => trackKey(item) === key);

    let queue = [...state.queue];
    if (existingIndex === -1) {
      queue.push(track);
    }

    const playIndex = existingIndex === -1 ? queue.length - 1 : existingIndex;
    usePlayerStore.setState({ queue });

    await playTrackAtIndex(playIndex);
  },

  async skipToNext() {
    const { currentIndex, queue } = usePlayerStore.getState();
    if (currentIndex >= queue.length - 1) return;
    await playTrackAtIndex(currentIndex + 1);
  },

  async skipToPrevious() {
    const { currentIndex } = usePlayerStore.getState();
    if (currentIndex <= 0) {
      webAudioPlayer.seek(0);
      usePlayerStore.getState().setProgress(0, usePlayerStore.getState().duration);
      return;
    }

    await playTrackAtIndex(currentIndex - 1);
  },

  async playQueueIndex(index: number) {
    const { queue } = usePlayerStore.getState();
    if (index < 0 || index >= queue.length) return;
    await playTrackAtIndex(index);
  },

  async play() {
    usePlayerStore.getState().setIsPlaying(true);
  },

  async pause() {
    usePlayerStore.getState().setIsPlaying(false);
  },

  async seekTo(position: number) {
    webAudioPlayer.seek(position);
    const { duration } = usePlayerStore.getState();
    usePlayerStore.getState().setProgress(position, duration);
  },

  async refreshExpiredStreamIfNeeded() {
    const { streamManifest, currentTrack, isPlaying } =
      usePlayerStore.getState();

    if (!streamManifest || !currentTrack || !isPlaying) return;
    if (!isStreamExpired(streamManifest.expiresAt)) return;

    const position = usePlayerStore.getState().position;
    const manifest = await resolveStreamManifest(currentTrack);
    usePlayerStore.setState({ streamManifest: manifest });
    webAudioPlayer.load(manifest.url);
    webAudioPlayer.seek(position);
    await webAudioPlayer.play();
  },

  async handleQueueEnded() {
    const { currentIndex, queue } = usePlayerStore.getState();
    if (currentIndex < queue.length - 1) {
      await this.skipToNext();
      return;
    }

    usePlayerStore.getState().setIsPlaying(false);
  },

  syncPlaybackState(_state?: unknown) {},
};

export const Event = {} as const;
export const State = {} as const;
