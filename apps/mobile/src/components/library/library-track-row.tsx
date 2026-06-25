import type { TrackMetadata } from "@vibevault/types";
import { formatDuration } from "@vibevault/utils";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { FavoriteButton } from "@/components/library/favorite-button";
import { DownloadButton } from "@/components/downloads/download-button";
import { formatArtists } from "@/lib/track-format";
import { usePlayTrack } from "@/hooks/use-play-track";
import { trackToSearchResult } from "@/lib/track-to-search-result";
import { trackKey, usePlayerStore } from "@/stores/player-store";

interface LibraryTrackRowProps {
  track: TrackMetadata;
  subtitle?: string;
  showFavorite?: boolean;
  showDownload?: boolean;
}

export function LibraryTrackRow({
  track,
  subtitle,
  showFavorite = true,
  showDownload = true,
}: LibraryTrackRowProps) {
  const playTrack = usePlayTrack();
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isResolving = usePlayerStore((state) => state.isResolving);

  const isActive = currentTrack ? trackKey(currentTrack) === trackKey(track) : false;
  const isResolvingThis =
    isResolving && playTrack.variables
      ? trackKey(trackToSearchResult(playTrack.variables)) === trackKey(track)
      : false;

  const handlePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    playTrack.mutate(trackToSearchResult(track));
  };

  return (
    <Pressable
      accessibilityRole="button"
      className={`flex-row items-center gap-3 rounded-vault-lg px-2 py-2 ${isActive ? "bg-vault-surface-elevated" : ""}`}
      onPress={handlePress}
    >
      <View className="h-12 w-12 overflow-hidden rounded-vault-md bg-vault-artwork-placeholder">
        {track.artworkUrl ? (
          <Image
            contentFit="cover"
            source={{ uri: track.artworkUrl }}
            style={{ width: 48, height: 48 }}
          />
        ) : null}
      </View>

      <View className="min-w-0 flex-1 gap-1">
        <Text className="font-inter-semibold text-base text-vault-text" numberOfLines={1}>
          {track.title}
        </Text>
        <Text className="font-inter text-sm text-vault-muted" numberOfLines={1}>
          {subtitle ?? formatArtists(track)}
        </Text>
      </View>

      <View className="flex-row items-center">
        {showFavorite ? <FavoriteButton track={track} /> : null}
        {showDownload ? <DownloadButton track={track} /> : null}
        {isResolvingThis ? (
          <ActivityIndicator color="#1ed760" size="small" />
        ) : track.durationMs !== undefined && !showFavorite && !showDownload ? (
          <Text className="font-inter text-sm text-vault-muted">
            {formatDuration(track.durationMs)}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
