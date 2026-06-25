import { FlashList } from "@shopify/flash-list";
import type { TrackMetadata } from "@vibevault/types";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { ProviderBadge } from "@/components/search/provider-badge";
import { Screen } from "@/components/ui/screen";
import { usePlayTrack } from "@/hooks/use-play-track";
import { usePlaylist } from "@/hooks/use-playlists";
import { formatArtists } from "@/lib/track-format";
import { trackToSearchResult } from "@/lib/track-to-search-result";
import { trackKey, usePlayerStore } from "@/stores/player-store";
import { formatDuration } from "@vibevault/utils";

function PlaylistTrackRow({
  track,
  isActive,
  isResolving,
  onPress,
}: {
  track: TrackMetadata;
  isActive: boolean;
  isResolving: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      className={`flex-row items-center gap-3 rounded-vault-lg px-2 py-2 ${isActive ? "bg-vault-surface-elevated" : ""}`}
      onPress={onPress}
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
          {formatArtists(track)}
        </Text>
        <ProviderBadge providerId={track.ref.providerId} />
      </View>

      <View className="min-w-[44px] items-end">
        {isResolving ? (
          <ActivityIndicator color="#1ed760" size="small" />
        ) : track.durationMs !== undefined ? (
          <Text className="font-inter text-sm text-vault-muted">
            {formatDuration(track.durationMs)}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function PlaylistDetailScreen() {
  const router = useRouter();
  const { playlistId } = useLocalSearchParams<{ playlistId: string }>();
  const { data, error, isLoading } = usePlaylist(playlistId ?? "");
  const playTrack = usePlayTrack();
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isResolving = usePlayerStore((state) => state.isResolving);

  const resolvingKey =
    isResolving && playTrack.variables
      ? trackKey(trackToSearchResult(playTrack.variables))
      : null;

  const activeKey = currentTrack ? trackKey(currentTrack) : null;

  if (isLoading) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#1ed760" size="large" />
        </View>
      </Screen>
    );
  }

  if (!data || error) {
    return (
      <Screen className="pt-4">
        <Text className="font-inter text-base text-vault-negative">
          Playlist not found.
        </Text>
      </Screen>
    );
  }

  return (
    <Screen className="pt-2" padded={false}>
      <View className="flex-row items-center gap-3 px-4 py-2">
        <Pressable accessibilityLabel="Go back" accessibilityRole="button" onPress={() => router.back()}>
          <Ionicons color="#ffffff" name="chevron-back" size={28} />
        </Pressable>
        <Text className="flex-1 font-jakarta text-lg text-vault-text" numberOfLines={1}>
          {data.name}
        </Text>
      </View>

      <View className="items-center px-6 py-4">
        <View className="h-40 w-40 overflow-hidden rounded-vault-lg bg-vault-artwork-placeholder">
          {data.artworkUrl ? (
            <Image
              contentFit="cover"
              source={{ uri: data.artworkUrl }}
              style={{ width: 160, height: 160 }}
            />
          ) : null}
        </View>
        <Text className="mt-4 text-center font-jakarta text-2xl text-vault-text">
          {data.name}
        </Text>
        <Text className="mt-1 font-inter text-sm text-vault-muted">
          {data.trackCount} tracks
        </Text>
      </View>

      <View className="min-h-[200px] flex-1 px-4">
        <FlashList
          data={data.tracks}
          keyExtractor={(item) => trackKey(item)}
          renderItem={({ item }) => (
            <PlaylistTrackRow
              isActive={trackKey(item) === activeKey}
              isResolving={trackKey(item) === resolvingKey}
              track={item}
              onPress={() => playTrack.mutate(trackToSearchResult(item))}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </Screen>
  );
}
