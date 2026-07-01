import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Pressable, View } from "react-native";

interface PlaybackButtonsProps {
  isPlaying: boolean;
  hasNext: boolean;
  hasPrevious: boolean;
  size?: "mini" | "full";
  onToggle: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

function hapticLight() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export function PlaybackButtons({
  isPlaying,
  hasNext,
  hasPrevious,
  size = "full",
  onToggle,
  onNext,
  onPrevious,
}: PlaybackButtonsProps) {
  const isMini = size === "mini";
  const iconSize = isMini ? 22 : 28;
  const playSize = isMini ? 26 : 36;

  const handleToggle = () => {
    hapticLight();
    onToggle();
  };

  const handleNext = () => {
    if (!hasNext) return;
    hapticLight();
    onNext();
  };

  const handlePrevious = () => {
    hapticLight();
    onPrevious();
  };

  if (isMini) {
    return (
      <Pressable
        accessibilityLabel={isPlaying ? "Pause" : "Play"}
        accessibilityRole="button"
        className="h-11 w-11 items-center justify-center rounded-full bg-vault-accent"
        hitSlop={8}
        onPress={handleToggle}
      >
        <Ionicons
          color="#000000"
          name={isPlaying ? "pause" : "play"}
          size={playSize}
          style={{ marginLeft: isPlaying ? 0 : 2 }}
        />
      </Pressable>
    );
  }

  return (
    <View className="flex-row items-center justify-center gap-8">
      <Pressable
        accessibilityLabel="Previous"
        accessibilityRole="button"
        className="p-2"
        disabled={!hasPrevious}
        hitSlop={8}
        onPress={handlePrevious}
      >
        <Ionicons
          color={hasPrevious ? "#ffffff" : "#4d4d4d"}
          name="play-skip-back"
          size={iconSize}
        />
      </Pressable>

      <Pressable
        accessibilityLabel={isPlaying ? "Pause" : "Play"}
        accessibilityRole="button"
        className="h-16 w-16 items-center justify-center rounded-full bg-vault-accent shadow-vault-glow"
        onPress={handleToggle}
      >
        <Ionicons
          color="#000000"
          name={isPlaying ? "pause" : "play"}
          size={playSize}
          style={{ marginLeft: isPlaying ? 0 : 3 }}
        />
      </Pressable>

      <Pressable
        accessibilityLabel="Next"
        accessibilityRole="button"
        className="p-2"
        disabled={!hasNext}
        hitSlop={8}
        onPress={handleNext}
      >
        <Ionicons
          color={hasNext ? "#ffffff" : "#4d4d4d"}
          name="play-skip-forward"
          size={iconSize}
        />
      </Pressable>
    </View>
  );
}
