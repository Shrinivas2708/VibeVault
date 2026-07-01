import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import type { ComponentProps } from "react";
import { Pressable, Text, View } from "react-native";

interface QuickTileProps {
  title: string;
  subtitle: string;
  icon: ComponentProps<typeof Ionicons>["name"];
  tint: string;
  onPress: () => void;
}

export function QuickTile({
  title,
  subtitle,
  icon,
  tint,
  onPress,
}: QuickTileProps) {
  return (
    <Pressable
      accessibilityRole="button"
      className="flex-1 overflow-hidden rounded-vault-xl border border-vault-border bg-vault-surface-card/90 p-4"
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
    >
      <View
        className="mb-3 h-11 w-11 items-center justify-center rounded-vault-lg"
        style={{ backgroundColor: `${tint}22` }}
      >
        <Ionicons color={tint} name={icon} size={22} />
      </View>
      <Text className="font-inter-semibold text-base text-vault-text">{title}</Text>
      <Text className="mt-1 font-inter text-xs text-vault-muted">{subtitle}</Text>
    </Pressable>
  );
}
