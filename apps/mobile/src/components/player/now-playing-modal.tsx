import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { FavoriteButton } from "@/components/library/favorite-button";
import { usePlaybackControls } from "@/hooks/use-playback-controls";
import { formatArtists } from "@/lib/track-format";
import { usePlayerUiStore } from "@/stores/player-ui-store";
import { usePlayerStore } from "@/stores/player-store";
import { PlaybackButtons } from "./playback-buttons";
import { ProgressBar } from "./progress-bar";
import { QueueSheet } from "./queue-sheet";
import { TrackArtwork } from "./track-artwork";

export function NowPlayingModal() {
  const isOpen = usePlayerUiStore((state) => state.isNowPlayingOpen);
  const isQueueOpen = usePlayerUiStore((state) => state.isQueueOpen);
  const closeNowPlaying = usePlayerUiStore((state) => state.closeNowPlaying);
  const toggleQueue = usePlayerUiStore((state) => state.toggleQueue);
  const closeQueue = usePlayerUiStore((state) => state.closeQueue);

  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const {
    isPlaying,
    position,
    duration,
    queue,
    currentIndex,
    hasNext,
    hasPrevious,
    toggle,
    skipToNext,
    skipToPrevious,
    seekTo,
    playQueueIndex,
  } = usePlaybackControls();

  if (!currentTrack) {
    return null;
  }

  return (
    <Modal
      animationType="none"
      presentationStyle="fullScreen"
      statusBarTranslucent
      transparent
      visible={isOpen}
      onRequestClose={closeNowPlaying}
    >
      <View className="flex-1 bg-vault-background">
        {currentTrack.artworkUrl ? (
          <Image
            contentFit="cover"
            source={{ uri: currentTrack.artworkUrl }}
            style={StyleSheet.absoluteFillObject}
          />
        ) : null}
        <BlurView intensity={90} style={StyleSheet.absoluteFillObject} tint="dark" />
        <View className="absolute inset-0 bg-black/55" />

        <SafeAreaView className="flex-1">
          <Animated.View
            className="flex-1"
            entering={SlideInDown.duration(300)}
            exiting={SlideOutDown.duration(250)}
          >
            <View className="flex-row items-center justify-between px-4 py-2">
              <Pressable
                accessibilityLabel="Close now playing"
                accessibilityRole="button"
                className="p-2"
                onPress={closeNowPlaying}
              >
                <Ionicons color="#ffffff" name="chevron-down" size={28} />
              </Pressable>

              <Pressable
                accessibilityLabel="Toggle queue"
                accessibilityRole="button"
                className="p-2"
                onPress={toggleQueue}
              >
                <Ionicons color="#ffffff" name="list" size={24} />
              </Pressable>
            </View>

            <View className="flex-1 items-center justify-center px-8">
              <TrackArtwork size={280} track={currentTrack} radius={12} />
              <View className="mt-8 w-full items-center gap-2">
                <Text
                  className="text-center font-jakarta text-2xl text-vault-text"
                  numberOfLines={2}
                >
                  {currentTrack.title}
                </Text>
                <View className="flex-row items-center justify-center gap-2">
                  <Text
                    className="text-center font-inter text-base text-vault-muted"
                    numberOfLines={1}
                  >
                    {formatArtists(currentTrack)}
                  </Text>
                  <FavoriteButton size={20} track={currentTrack} />
                </View>
              </View>
            </View>

            <View className="gap-6 px-6 pb-8">
              <ProgressBar
                duration={duration}
                large
                position={position}
                onSeek={seekTo}
              />
              <PlaybackButtons
                hasNext={hasNext}
                hasPrevious={hasPrevious}
                isPlaying={isPlaying}
                size="full"
                onNext={skipToNext}
                onPrevious={skipToPrevious}
                onToggle={toggle}
              />
            </View>
          </Animated.View>

          {isQueueOpen ? (
            <Animated.View
              className="absolute inset-x-0 bottom-0"
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(150)}
            >
              <QueueSheet
                currentIndex={currentIndex}
                queue={queue}
                onClose={closeQueue}
                onSelect={(index) => {
                  playQueueIndex(index);
                  closeQueue();
                }}
              />
            </Animated.View>
          ) : null}
        </SafeAreaView>
      </View>
    </Modal>
  );
}
