import { FlashList } from "@shopify/flash-list";
import { RefreshControl, Text, View } from "react-native";
import { LibraryTrackRow } from "@/components/library/library-track-row";
import { VaultHeading, VaultSubheading } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Screen } from "@/components/ui/screen";
import { TrackListSkeleton } from "@/components/ui/skeleton";
import { useFavorites } from "@/hooks/use-favorites";
import { getErrorMessage } from "@/lib/error-message";

export default function FavoritesScreen() {
  const { data, error, isLoading, refetch, isRefetching } = useFavorites();

  const errorMessage = error ? getErrorMessage(error, "Could not load favorites.") : null;

  return (
    <Screen className="pt-4" padded={false}>
      <View className="px-6">
        <VaultHeading>Likes</VaultHeading>
        <VaultSubheading>Tracks you liked — tap ♥ on any song to save it here.</VaultSubheading>
      </View>

      <View className="mt-6 min-h-[200px] flex-1 px-4">
        {isLoading ? <TrackListSkeleton /> : null}

        {errorMessage ? (
          <ErrorState message={errorMessage} onRetry={() => void refetch()} />
        ) : null}

        {!isLoading && !errorMessage && (data?.length ?? 0) === 0 ? (
          <Text className="px-6 text-center font-inter text-sm text-vault-muted">
            No favorites yet. Tap the heart on any track to save it here.
          </Text>
        ) : null}

        {!isLoading && !errorMessage && data && data.length > 0 ? (
          <FlashList
            data={data}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                tintColor="#1ed760"
                onRefresh={() => void refetch()}
              />
            }
            renderItem={({ item }) => (
              <LibraryTrackRow showFavorite track={item.track} />
            )}
            showsVerticalScrollIndicator={false}
          />
        ) : null}
      </View>
    </Screen>
  );
}
