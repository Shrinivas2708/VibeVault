import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

interface SearchMessageProps {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function SearchMessage({
  title,
  subtitle,
  icon = "musical-notes",
}: SearchMessageProps) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <View className="mb-5 h-20 w-20 items-center justify-center rounded-full border border-vault-border-light bg-vault-surface-elevated">
        <Ionicons color="#1ed760" name={icon} size={34} />
      </View>
      <Text className="text-center font-jakarta text-xl text-vault-text">{title}</Text>
      {subtitle ? (
        <Text className="mt-3 max-w-xs text-center font-inter text-sm leading-6 text-vault-muted">
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
