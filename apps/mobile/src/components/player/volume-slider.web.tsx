import { Ionicons } from "@expo/vector-icons";
import { createElement, useCallback } from "react";
import { Pressable, Text, View } from "react-native";
import { usePlayerStore } from "@/stores/player-store";

interface VolumeSliderProps {
  showLabel?: boolean;
}

export function VolumeSlider({ showLabel = false }: VolumeSliderProps) {
  const volume = usePlayerStore((state) => state.volume);
  const setVolume = usePlayerStore((state) => state.setVolume);

  const handleChange = useCallback(
    (event: Event) => {
      const target = event.target as HTMLInputElement;
      const next = Number.parseFloat(target.value) / 100;
      setVolume(next);
    },
    [setVolume],
  );

  const toggleMute = useCallback(() => {
    setVolume(volume > 0 ? 0 : 0.85);
  }, [setVolume, volume]);

  const iconName =
    volume === 0 ? "volume-mute" : volume < 0.35 ? "volume-low" : "volume-high";

  return (
    <View className="gap-2">
      {showLabel ? (
        <View className="flex-row items-center justify-between">
          <Text className="font-inter-semibold text-xs uppercase tracking-[1.5px] text-vault-muted">
            Volume
          </Text>
          <Text className="font-inter text-xs text-vault-muted">{Math.round(volume * 100)}%</Text>
        </View>
      ) : null}

      <View className="flex-row items-center gap-3">
        <Pressable
          accessibilityLabel={volume === 0 ? "Unmute" : "Mute"}
          accessibilityRole="button"
          hitSlop={8}
          onPress={toggleMute}
        >
          <Ionicons color="#ffffff" name={iconName} size={20} />
        </Pressable>

        {createElement("input", {
          "aria-label": "Volume",
          "aria-valuetext": `${Math.round(volume * 100)} percent`,
          max: 100,
          min: 0,
          type: "range",
          value: Math.round(volume * 100),
          onChange: handleChange,
          onInput: handleChange,
          style: {
            flex: 1,
            width: "100%",
            height: 20,
            margin: 0,
            accentColor: "#1ed760",
            cursor: "pointer",
          },
        })}
      </View>
    </View>
  );
}
