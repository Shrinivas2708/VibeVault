import { FlashList } from "@shopify/flash-list";
import { ActivityIndicator, Text, View } from "react-native";
import { LibraryTrackRow } from "@/components/library/library-track-row";
import { VaultHeading, VaultSubheading } from "@/components/ui/button";
import { Screen } from "@/components/ui/screen";
import { useFavorites } from "@/hooks/use-favorites";
import { ApiClientError } from "@/lib/api-client";

export default function FavoritesScreen() {
  const { data, error, isLoading } = useFavorites();

  const errorMessage =
    error instanceof ApiClientError
      ? error.message
      : error
        ? "Could not load favorites."
        : null;

  return (
    <Screen className="pt-4" padded={false}>
      <View className="px-6">
        <VaultHeading>Favorites</VaultHeading>
        <VaultSubheading>Tracks you have saved.</VaultSubheading>
      </View>

      <View className="mt-6 min-h-[200px] flex-1 px-4">
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color="#1ed760" size="large" />
          </View>
        ) : null}

        {errorMessage ? (
          <Text className="px-6 text-center font-inter text-sm text-vault-negative">
            {errorMessage}
          </Text>
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
