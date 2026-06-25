import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { PlaylistCard } from "@/components/library/playlist-card";
import { VaultButton, VaultHeading, VaultSubheading } from "@/components/ui/button";
import { Screen } from "@/components/ui/screen";
import { useFavorites } from "@/hooks/use-favorites";
import { useHistory } from "@/hooks/use-history";
import { usePlaylists } from "@/hooks/use-playlists";
import { ApiClientError } from "@/lib/api-client";
import { useDownloadStore } from "@/stores/download-store";

export default function LibraryScreen() {
  const router = useRouter();
  const { data, error, isLoading, refetch, isRefetching } = usePlaylists();
  const { data: favorites } = useFavorites();
  const { data: history } = useHistory(50);
  const downloadCount = useDownloadStore((state) => state.records.length);

  const errorMessage =
    error instanceof ApiClientError
      ? error.message
      : error
        ? "Could not load your library."
        : null;

  return (
    <Screen className="pt-4" padded={false}>
      <View className="px-6">
        <VaultHeading>Your Library</VaultHeading>
        <VaultSubheading>Playlists, favorites, and offline downloads.</VaultSubheading>

        <View className="mt-6 gap-3">
          <Pressable
            accessibilityRole="button"
            className="flex-row items-center justify-between rounded-vault-lg bg-vault-surface-elevated px-4 py-4"
            onPress={() => router.push("/(tabs)/library/favorites")}
          >
            <View>
              <Text className="font-inter-semibold text-base text-vault-text">
                Favorites
              </Text>
              <Text className="mt-1 font-inter text-sm text-vault-muted">
                {favorites?.length ?? 0} saved tracks
              </Text>
            </View>
            <Text className="font-inter text-sm text-vault-muted">›</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            className="flex-row items-center justify-between rounded-vault-lg bg-vault-surface-elevated px-4 py-4"
            onPress={() => router.push("/(tabs)/library/history")}
          >
            <View>
              <Text className="font-inter-semibold text-base text-vault-text">
                History
              </Text>
              <Text className="mt-1 font-inter text-sm text-vault-muted">
                {history?.length ?? 0} recently played
              </Text>
            </View>
            <Text className="font-inter text-sm text-vault-muted">›</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            className="flex-row items-center justify-between rounded-vault-lg bg-vault-surface-elevated px-4 py-4"
            onPress={() => router.push("/(tabs)/library/downloads")}
          >
            <View>
              <Text className="font-inter-semibold text-base text-vault-text">
                Downloads
              </Text>
              <Text className="mt-1 font-inter text-sm text-vault-muted">
                {downloadCount} saved for offline
              </Text>
            </View>
            <Text className="font-inter text-sm text-vault-muted">›</Text>
          </Pressable>

          <VaultButton
            label="Import Spotify playlist"
            onPress={() => router.push("/(tabs)/library/import")}
          />
        </View>
      </View>

      <View className="mt-6 min-h-[200px] flex-1 px-4">
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#1ed760" size="large" />
          </View>
        ) : null}

        {errorMessage ? (
          <View className="items-center px-6 py-10">
            <Text className="text-center font-inter text-sm text-vault-negative">
              {errorMessage}
            </Text>
            <View className="mt-4 w-full">
              <VaultButton label="Retry" onPress={() => void refetch()} variant="secondary" />
            </View>
          </View>
        ) : null}

        {!isLoading && !errorMessage && (data?.length ?? 0) === 0 ? (
          <View className="items-center px-6 py-10">
            <Text className="text-center font-inter text-sm text-vault-muted">
              No playlists yet. Import one to get started.
            </Text>
          </View>
        ) : null}

        {!isLoading && !errorMessage && data && data.length > 0 ? (
          <FlashList
            data={data}
            extraData={isRefetching}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <PlaylistCard playlist={item} />}
            showsVerticalScrollIndicator={false}
          />
        ) : null}
      </View>
    </Screen>
  );
}
