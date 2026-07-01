import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { usePlaybackControls } from "@/hooks/use-playback-controls";
import { formatArtists } from "@/lib/track-format";
import { usePlayerUiStore } from "@/stores/player-ui-store";
import { usePlayerStore } from "@/stores/player-store";
import { FavoriteButton } from "@/components/library/favorite-button";
import { PlaybackButtons } from "./playback-buttons";
import { ProgressBar } from "./progress-bar";
import { TrackArtwork } from "./track-artwork";

export function MiniPlayer() {
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const queueLength = usePlayerStore((state) => state.queue.length);
  const openNowPlaying = usePlayerUiStore((state) => state.openNowPlaying);
  const openQueue = usePlayerUiStore((state) => state.openQueue);
  const {
    isPlaying,
    position,
    duration,
    hasNext,
    hasPrevious,
    toggle,
    skipToNext,
    skipToPrevious,
    seekTo,
  } = usePlaybackControls();

  if (!currentTrack) {
    return null;
  }

  const handleOpenQueue = () => {
    openNowPlaying();
    openQueue();
  };

  return (
    <View className="overflow-hidden rounded-t-vault-2xl border-t border-vault-border bg-vault-surface-card/95 shadow-vault-medium">
      <View className="px-4 pt-2">
        <ProgressBar duration={duration} position={position} onSeek={seekTo} />
      </View>

      <View className="flex-row items-center gap-2 px-4 py-3">
        <Pressable
          accessibilityRole="button"
          className="min-w-0 flex-1 flex-row items-center gap-3"
          onPress={openNowPlaying}
        >
          <TrackArtwork size={52} track={currentTrack} radius={12} />
          <View className="min-w-0 flex-1">
            <View className="flex-row items-center gap-1.5">
              {isPlaying ? (
                <Ionicons color="#1ed760" name="pulse" size={12} />
              ) : null}
              <Text
                className="font-inter-semibold text-sm text-vault-text"
                numberOfLines={1}
              >
                {currentTrack.title}
              </Text>
            </View>
            <Text className="font-inter text-xs text-vault-muted" numberOfLines={1}>
              {formatArtists(currentTrack)}
            </Text>
          </View>
        </Pressable>

        <Pressable
          accessibilityLabel="Open queue"
          accessibilityRole="button"
          className="h-9 w-9 items-center justify-center rounded-full bg-vault-surface-elevated"
          onPress={handleOpenQueue}
        >
          <Ionicons color="#ffffff" name="list" size={18} />
          {queueLength > 1 ? (
            <View className="absolute -right-1 -top-1 min-w-[16px] rounded-full bg-vault-accent px-1">
              <Text className="text-center font-inter-bold text-[10px] text-black">
                {queueLength}
              </Text>
            </View>
          ) : null}
        </Pressable>

        <PlaybackButtons
          hasNext={hasNext}
          hasPrevious={hasPrevious}
          isPlaying={isPlaying}
          size="mini"
          onNext={skipToNext}
          onPrevious={skipToPrevious}
          onToggle={toggle}
        />
        <FavoriteButton size={18} track={currentTrack} />
      </View>
    </View>
  );
}
