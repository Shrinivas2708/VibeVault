import type { TrackMetadata } from "@vibevault/types";
import { formatDuration } from "@vibevault/utils";
import * as Haptics from "expo-haptics";
import { ActivityIndicator, Text, View } from "react-native";
import { DownloadButton } from "@/components/downloads/download-button";
import { FavoriteButton } from "@/components/library/favorite-button";
import { ArtworkImage } from "@/components/ui/artwork-image";
import { GlassCard } from "@/components/ui/glass-card";
import { usePlayTrack } from "@/hooks/use-play-track";
import { formatArtists } from "@/lib/track-format";
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
    <GlassCard active={isActive} className="mb-2" onPress={handlePress}>
      <View className="flex-row items-center gap-3 p-3">
        <ArtworkImage
          label={`${track.title} artwork`}
          radius={12}
          size={52}
          uri={track.artworkUrl}
        />

        <View className="min-w-0 flex-1 gap-1">
          <Text className="font-inter-semibold text-base text-vault-text" numberOfLines={1}>
            {track.title}
          </Text>
          <Text className="font-inter text-sm text-vault-muted" numberOfLines={1}>
            {subtitle ?? formatArtists(track)}
          </Text>
        </View>

        <View className="flex-row items-center gap-1">
          {showFavorite ? <FavoriteButton track={track} /> : null}
          {showDownload ? <DownloadButton track={track} /> : null}
          {isResolvingThis ? (
            <ActivityIndicator color="#1ed760" size="small" />
          ) : track.durationMs !== undefined && !showFavorite && !showDownload ? (
            <Text className="font-inter text-xs text-vault-muted">
              {formatDuration(track.durationMs)}
            </Text>
          ) : null}
        </View>
      </View>
    </GlassCard>
  );
}
