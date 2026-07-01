import type { TrackMetadata } from "@vibevault/types";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ActivityIndicator, Pressable, type GestureResponderEvent } from "react-native";
import { useIsFavorite, useToggleFavorite } from "@/hooks/use-favorites";
import { showToast } from "@/stores/toast-store";

interface FavoriteButtonProps {
  track: TrackMetadata;
  size?: number;
}

export function FavoriteButton({ track, size = 20 }: FavoriteButtonProps) {
  const isFavorite = useIsFavorite(track);
  const toggleFavorite = useToggleFavorite();

  const handlePress = (event: GestureResponderEvent) => {
    event.stopPropagation();
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleFavorite.mutate(
      { track, isFavorite },
      {
        onSuccess: (liked) => {
          showToast(liked ? "Added to Likes" : "Removed from Likes");
        },
      },
    );
  };

  if (toggleFavorite.isPending) {
    return (
      <Pressable className="h-9 w-9 items-center justify-center rounded-full bg-vault-surface-elevated">
        <ActivityIndicator color="#1ed760" size="small" />
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityLabel={isFavorite ? "Unlike track" : "Like track"}
      accessibilityRole="button"
      className={`h-9 w-9 items-center justify-center rounded-full ${
        isFavorite ? "bg-vault-accent-soft" : "bg-vault-surface-elevated"
      }`}
      hitSlop={6}
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
