import type { SearchResult } from "@vibevault/types";
import { formatDuration } from "@vibevault/utils";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { ProviderBadge } from "./provider-badge";
import { DownloadButton } from "@/components/downloads/download-button";
import { FavoriteButton } from "@/components/library/favorite-button";
import { searchResultToTrack } from "@/stores/player-store";

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

  return (
    <Pressable
      accessibilityRole="button"
      className={`flex-row items-center gap-3 rounded-vault-lg px-2 py-2 ${isActive ? "bg-vault-surface-elevated" : ""}`}
      onPress={handlePress}
    >
      <View className="h-12 w-12 overflow-hidden rounded-vault-md bg-vault-artwork-placeholder">
        {result.artworkUrl ? (
          <Image
            accessibilityLabel={`${result.title} artwork`}
            contentFit="cover"
            source={{ uri: result.artworkUrl }}
            style={{ width: 48, height: 48 }}
          />
        ) : null}
      </View>

      <View className="min-w-0 flex-1 gap-1">
        <Text className="font-inter-semibold text-base text-vault-text" numberOfLines={1}>
          {result.title}
        </Text>
        <Text className="font-inter text-sm text-vault-muted" numberOfLines={1}>
          {artistLine(result)}
        </Text>
        <ProviderBadge providerId={result.providerId} />
      </View>

      <View className="min-w-[44px] items-end flex-row">
        <FavoriteButton track={searchResultToTrack(result)} />
        <DownloadButton track={result} />
        {isResolving ? (
          <ActivityIndicator color="#1ed760" size="small" />
        ) : result.durationMs !== undefined ? (
          <Text className="font-inter text-sm text-vault-muted">
            {formatDuration(result.durationMs)}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
