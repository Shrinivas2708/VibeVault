import { Ionicons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import { Pressable, View } from "react-native";
import { usePlayerStore } from "@/stores/player-store";
import { VolumeSlider } from "./volume-slider";

export function VolumePopover() {
  const [open, setOpen] = useState(false);
  const volume = usePlayerStore((state) => state.volume);

  const toggle = useCallback(() => {
    setOpen((value) => !value);
  }, []);

  const iconName =
    volume === 0 ? "volume-mute" : volume < 0.35 ? "volume-low" : "volume-high";

  return (
    <View className="relative">
      {open ? (
        <View className="absolute bottom-9 right-0 z-30 w-56 rounded-vault-xl border border-vault-border bg-vault-surface-elevated p-3 shadow-vault-medium">
          <VolumeSlider showLabel />
        </View>
      ) : null}

      <Pressable
        accessibilityLabel="Adjust volume"
        accessibilityRole="button"
        className="h-8 w-8 items-center justify-center"
        hitSlop={6}
        onPress={toggle}
      >
        <Ionicons color={open ? "#1ed760" : "#b3b3b3"} name={iconName} size={18} />
      </Pressable>
    </View>
  );
}
