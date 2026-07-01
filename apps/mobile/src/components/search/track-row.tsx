import type { SearchResult } from "@vibevault/types";
import { formatDuration } from "@vibevault/utils";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { DownloadButton } from "@/components/downloads/download-button";
import { FavoriteButton } from "@/components/library/favorite-button";
import { ArtworkImage } from "@/components/ui/artwork-image";
import { GlassCard } from "@/components/ui/glass-card";
import { searchResultToTrack } from "@/stores/player-store";
import { ProviderBadge } from "./provider-badge";

interface TrackRowProps {
  result: SearchResult;
  onPress: (result: SearchResult) => void;
  isResolving?: boolean;
  isActive?: boolean;
}

function artistLine(result: SearchResult) {
  return result.artists.map((artist) => artist.name).join(", ");
}

export function TrackRow({
  result,
  onPress,
  isResolving = false,
  isActive = false,
}: TrackRowProps) {
  const handlePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(result);
  };

  const track = searchResultToTrack(result);

  return (
    <GlassCard active={isActive} className="mb-2">
      <View className="flex-row items-center gap-2 p-3">
        <Pressable
          accessibilityRole="button"
          className="min-w-0 flex-1 flex-row items-center gap-3"
          onPress={handlePress}
        >
          <View className="relative">
            <ArtworkImage
              label={`${result.title} artwork`}
              radius={12}
              size={56}
              uri={result.artworkUrl}
            />
            {isActive ? (
              <View className="absolute inset-0 items-center justify-center rounded-vault-lg bg-black/45">
                <Ionicons color="#1ed760" name="volume-high" size={22} />
              </View>
            ) : null}
          </View>

          <View className="min-w-0 flex-1 gap-1.5">
            <Text className="font-inter-semibold text-base text-vault-text" numberOfLines={1}>
              {result.title}
            </Text>
            <Text className="font-inter text-sm text-vault-muted" numberOfLines={1}>
              {artistLine(result)}
            </Text>
            <ProviderBadge providerId={result.providerId} />
          </View>
        </Pressable>

        <View className="items-center gap-2">
          <View className="flex-row items-center gap-1.5">
            <FavoriteButton track={track} />
            <DownloadButton track={result} />
          </View>
          {isResolving ? (
            <ActivityIndicator color="#1ed760" size="small" />
          ) : result.durationMs !== undefined ? (
            <Text className="font-inter text-xs text-vault-muted">
              {formatDuration(result.durationMs)}
            </Text>
          ) : null}
        </View>
      </View>
    </GlassCard>
  );
}
