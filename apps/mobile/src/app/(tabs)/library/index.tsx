import { FlashList } from "@shopify/flash-list";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, RefreshControl, Text, View } from "react-native";
import { PlaylistCard } from "@/components/library/playlist-card";
import { VaultButton, VaultHeading, VaultSubheading } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { PlaylistListSkeleton } from "@/components/ui/skeleton";
import { Screen } from "@/components/ui/screen";
import { useFavorites } from "@/hooks/use-favorites";
import { useHistory } from "@/hooks/use-history";
import { usePlaylists } from "@/hooks/use-playlists";
import { getErrorMessage } from "@/lib/error-message";
import { useDownloadStore } from "@/stores/download-store";

interface LibraryShortcutProps {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  onPress: () => void;
}

function LibraryShortcut({ title, subtitle, icon, tint, onPress }: LibraryShortcutProps) {
  return (
    <Pressable
      accessibilityRole="button"
      className="flex-row items-center gap-4 rounded-vault-xl border border-vault-border bg-vault-surface-card/90 px-4 py-4"
      onPress={onPress}
    >
      <View
        className="h-12 w-12 items-center justify-center rounded-vault-lg"
        style={{ backgroundColor: `${tint}20` }}
      >
        <Ionicons color={tint} name={icon} size={22} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="font-inter-semibold text-base text-vault-text">{title}</Text>
        <Text className="mt-1 font-inter text-sm text-vault-muted">{subtitle}</Text>
      </View>
      <Ionicons color="#666" name="chevron-forward" size={18} />
    </Pressable>
  );
}

export default function LibraryScreen() {
  const router = useRouter();
  const { data, error, isLoading, refetch, isRefetching } = usePlaylists();
  const { data: favorites } = useFavorites();
  const { data: history } = useHistory(50);
  const downloadCount = useDownloadStore((state) => state.records.length);

  const errorMessage = error ? getErrorMessage(error, "Could not load your library.") : null;

  return (
    <Screen className="pt-2" padded={false}>
      <View className="px-6">
        <Text className="font-inter text-sm uppercase tracking-[2px] text-vault-accent">
          Collection
        </Text>
        <VaultHeading>Your Library</VaultHeading>
        <VaultSubheading>Playlists, favorites, and offline vault.</VaultSubheading>

        <View className="mt-6 gap-3">
          <LibraryShortcut
            icon="heart"
            subtitle={`${favorites?.length ?? 0} saved tracks`}
            tint="#f3727f"
            title="Likes"
            onPress={() => router.push("/(tabs)/library/favorites")}
          />
          <LibraryShortcut
            icon="time"
            subtitle={`${history?.length ?? 0} recently played`}
            tint="#ffa42b"
            title="History"
            onPress={() => router.push("/(tabs)/library/history")}
          />
          <LibraryShortcut
            icon="download-outline"
            subtitle={`${downloadCount} saved for offline`}
            tint="#539df5"
            title="Downloads"
            onPress={() => router.push("/(tabs)/library/downloads")}
          />
          <VaultButton
            label="Import playlist"
            variant="secondary"
            uppercase={false}
            onPress={() => router.push("/(tabs)/library/import")}
          />
        </View>
      </View>

      <View className="mt-8 min-h-[200px] flex-1 px-4">
        <Text className="mb-3 px-2 font-jakarta text-lg text-vault-text">Playlists</Text>

        {isLoading ? <PlaylistListSkeleton /> : null}

        {errorMessage ? (
          <ErrorState
            message={errorMessage}
            subtitle="Check that the API is running and try again."
            onRetry={() => void refetch()}
          />
        ) : null}

        {!isLoading && !errorMessage && (data?.length ?? 0) === 0 ? (
          <View className="items-center rounded-vault-xl border border-vault-border bg-vault-surface-card/70 px-6 py-10">
            <Ionicons color="#1ed760" name="albums-outline" size={36} />
            <Text className="mt-4 text-center font-inter-semibold text-base text-vault-text">
              No playlists yet
            </Text>
            <Text className="mt-2 text-center font-inter text-sm text-vault-muted">
              Import a Spotify playlist to build your collection.
            </Text>
          </View>
        ) : null}

        {!isLoading && !errorMessage && data && data.length > 0 ? (
          <FlashList
            data={data}
            extraData={isRefetching}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                tintColor="#1ed760"
                onRefresh={() => void refetch()}
              />
            }
            renderItem={({ item }) => <PlaylistCard playlist={item} />}
            showsVerticalScrollIndicator={false}
          />
        ) : null}
      </View>
    </Screen>
  );
}
