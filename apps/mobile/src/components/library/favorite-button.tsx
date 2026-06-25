import type { TrackMetadata } from "@vibevault/types";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ActivityIndicator, Pressable } from "react-native";
import { useIsFavorite, useToggleFavorite } from "@/hooks/use-favorites";

interface FavoriteButtonProps {
  track: TrackMetadata;
  size?: number;
}

export function FavoriteButton({ track, size = 22 }: FavoriteButtonProps) {
  const isFavorite = useIsFavorite(track);
  const toggleFavorite = useToggleFavorite();

  const handlePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleFavorite.mutate({ track, isFavorite });
  };

  if (toggleFavorite.isPending) {
    return <ActivityIndicator color="#1ed760" size="small" />;
  }

  return (
    <Pressable
      accessibilityLabel={isFavorite ? "Remove from favorites" : "Add to favorites"}
      accessibilityRole="button"
      className="p-2"
      hitSlop={8}
      onPress={handlePress}
    >
      <Ionicons
        color={isFavorite ? "#1ed760" : "#b3b3b3"}
        name={isFavorite ? "heart" : "heart-outline"}
        size={size}
      />
    </Pressable>
  );
}
