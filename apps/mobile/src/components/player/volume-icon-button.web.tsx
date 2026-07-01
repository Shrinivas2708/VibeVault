import { Ionicons } from "@expo/vector-icons";
import { useCallback } from "react";
import { Pressable } from "react-native";
import { usePlayerStore } from "@/stores/player-store";

export function VolumeIconButton() {
  const volume = usePlayerStore((state) => state.volume);
  const setVolume = usePlayerStore((state) => state.setVolume);

  const toggleMute = useCallback(() => {
    setVolume(volume > 0 ? 0 : 0.85);
  }, [setVolume, volume]);

  return (
    <Pressable
      accessibilityLabel={volume === 0 ? "Unmute" : "Mute"}
      accessibilityRole="button"
      className="h-8 w-8 items-center justify-center"
      hitSlop={6}
      onPress={toggleMute}
    >
      <Ionicons
        color="#b3b3b3"
        name={volume === 0 ? "volume-mute" : volume < 0.5 ? "volume-low" : "volume-medium"}
        size={16}
      />
    </Pressable>
  );
}
