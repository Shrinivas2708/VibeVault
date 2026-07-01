import type { SavedPlaylistSummary } from "@vibevault/types";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { ProviderBadge } from "@/components/search/provider-badge";
import { ArtworkImage } from "@/components/ui/artwork-image";
import { GlassCard } from "@/components/ui/glass-card";

interface PlaylistCardProps {
  playlist: SavedPlaylistSummary;
}

export function PlaylistCard({ playlist }: PlaylistCardProps) {
  return (
    <Link asChild href={`/(tabs)/library/${playlist.id}`}>
      <Pressable accessibilityRole="button" className="mb-2">
        <GlassCard>
          <View className="flex-row items-center gap-3 p-3">
            <ArtworkImage
              label={`${playlist.name} artwork`}
              radius={12}
              size={60}
              uri={playlist.artworkUrl}
            />

            <View className="min-w-0 flex-1">
              <Text className="font-inter-semibold text-base text-vault-text" numberOfLines={1}>
                {playlist.name}
              </Text>
              <Text className="mt-1 font-inter text-sm text-vault-muted">
                {playlist.trackCount} tracks
              </Text>
              <View className="mt-2">
                <ProviderBadge providerId={playlist.sourceProviderId} />
              </View>
            </View>

            <Ionicons color="#666" name="chevron-forward" size={18} />
          </View>
        </GlassCard>
      </Pressable>
    </Link>
  );
}
