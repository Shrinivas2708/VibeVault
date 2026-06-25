import type { SavedPlaylistSummary } from "@vibevault/types";
import { Image } from "expo-image";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";

interface PlaylistCardProps {
  playlist: SavedPlaylistSummary;
}

export function PlaylistCard({ playlist }: PlaylistCardProps) {
  return (
    <Link asChild href={`/(tabs)/library/${playlist.id}`}>
      <Pressable
        accessibilityRole="button"
        className="flex-row items-center gap-3 rounded-vault-lg bg-vault-surface-elevated px-3 py-3"
      >
        <View className="h-14 w-14 overflow-hidden rounded-vault-md bg-vault-artwork-placeholder">
          {playlist.artworkUrl ? (
            <Image
              contentFit="cover"
              source={{ uri: playlist.artworkUrl }}
              style={{ width: 56, height: 56 }}
            />
          ) : null}
        </View>

        <View className="min-w-0 flex-1">
          <Text className="font-inter-semibold text-base text-vault-text" numberOfLines={1}>
            {playlist.name}
          </Text>
          <Text className="mt-1 font-inter text-sm text-vault-muted">
            {playlist.trackCount} tracks · Spotify
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}
