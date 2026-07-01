import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { usePlaybackControls } from "@/hooks/use-playback-controls";
import { formatArtists } from "@/lib/track-format";
import { usePlayerUiStore } from "@/stores/player-ui-store";
import { usePlayerStore } from "@/stores/player-store";
import { FavoriteButton } from "@/components/library/favorite-button";
import { VolumeSlider } from "@/components/player/volume-slider";
import { PlaybackButtons } from "./playback-buttons";
import { ProgressBar } from "./progress-bar";
import { TrackArtwork } from "./track-artwork";

export function MiniPlayer() {
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const queueLength = usePlayerStore((state) => state.queue.length);
  const volume = usePlayerStore((state) => state.volume);
  const openNowPlaying = usePlayerUiStore((state) => state.openNowPlaying);
  const openQueue = usePlayerUiStore((state) => state.openQueue);
  const [showVolume, setShowVolume] = useState(false);
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

  const volumeIcon =
    volume === 0 ? "volume-mute" : volume < 0.35 ? "volume-low" : "volume-high";

  return (
    <View className="overflow-hidden rounded-t-vault-xl border-t border-vault-border bg-vault-surface-card/95">
      {Platform.OS === "web" && showVolume ? (
        <View className="border-b border-vault-border px-3 py-2">
          <VolumeSlider showLabel />
        </View>
      ) : null}

      <View className="px-3 pt-1.5">
        <ProgressBar compact duration={duration} position={position} onSeek={seekTo} />
      </View>

      <View className="flex-row items-center gap-1.5 px-3 py-2">
        <Pressable
          accessibilityRole="button"
          className="min-w-0 flex-1 flex-row items-center gap-2.5"
          onPress={openNowPlaying}
        >
          <TrackArtwork size={40} track={currentTrack} radius={8} />
          <View className="min-w-0 flex-1">
            <Text className="font-inter-semibold text-sm text-vault-text" numberOfLines={1}>
              {currentTrack.title}
            </Text>
            <Text className="font-inter text-xs text-vault-muted" numberOfLines={1}>
              {formatArtists(currentTrack)}
            </Text>
          </View>
        </Pressable>

        {Platform.OS === "web" ? (
          <Pressable
            accessibilityLabel="Adjust volume"
            accessibilityRole="button"
            className="h-8 w-8 items-center justify-center"
            hitSlop={6}
            onPress={() => setShowVolume((value) => !value)}
          >
            <Ionicons
              color={showVolume ? "#1ed760" : "#b3b3b3"}
              name={volumeIcon}
              size={18}
            />
          </Pressable>
        ) : null}

        <Pressable
          accessibilityLabel="Open queue"
          accessibilityRole="button"
          className="h-8 w-8 items-center justify-center"
          onPress={handleOpenQueue}
        >
          <Ionicons color="#b3b3b3" name="list" size={18} />
          {queueLength > 0 ? (
            <View className="absolute -right-0.5 -top-0.5 min-w-[14px] rounded-full bg-vault-accent px-0.5">
              <Text className="text-center font-inter-bold text-[9px] text-black">
                {queueLength > 99 ? "99+" : queueLength}
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
        <FavoriteButton size={16} track={currentTrack} />
      </View>
    </View>
  );
}
