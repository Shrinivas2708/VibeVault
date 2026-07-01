import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Pressable, TextInput, View } from "react-native";

interface SearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear?: () => void;
  autoFocus?: boolean;
}

export function SearchInput({
  value,
  onChangeText,
  onClear,
  autoFocus = false,
}: SearchInputProps) {
  const handleClear = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChangeText("");
    onClear?.();
  };

  return (
    <View className="flex-row items-center rounded-vault-pill border border-vault-border-light bg-vault-surface-card/90 px-4 py-3.5 shadow-vault-soft">
      <View className="h-9 w-9 items-center justify-center rounded-full bg-vault-accent-soft">
        <Ionicons color="#1ed760" name="search" size={18} />
      </View>
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={autoFocus}
        className="ml-3 flex-1 font-inter text-base text-vault-text"
        placeholder="Songs, artists, albums…"
        placeholderTextColor="#7c7c7c"
        returnKeyType="search"
        value={value}
        onChangeText={onChangeText}
      />
      {value.length > 0 ? (
        <Pressable
          accessibilityLabel="Clear search"
          accessibilityRole="button"
          className="ml-2 rounded-full bg-vault-surface-elevated p-1.5"
          hitSlop={8}
          onPress={handleClear}
        >
          <Ionicons color="#b3b3b3" name="close" size={16} />
        </Pressable>
      ) : null}
    </View>
  );
}
