import { FlashList } from "@shopify/flash-list";
import { ActivityIndicator, Text, View } from "react-native";
import { LibraryTrackRow } from "@/components/library/library-track-row";
import { VaultHeading, VaultSubheading } from "@/components/ui/button";
import { Screen } from "@/components/ui/screen";
import { useHistory } from "@/hooks/use-history";
import { formatArtists } from "@/lib/track-format";
import { ApiClientError } from "@/lib/api-client";

function formatPlayedAt(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function HistoryScreen() {
  const { data, error, isLoading } = useHistory();

  const errorMessage =
    error instanceof ApiClientError
      ? error.message
      : error
        ? "Could not load history."
        : null;

  return (
    <Screen className="pt-4" padded={false}>
      <View className="px-6">
        <VaultHeading>History</VaultHeading>
        <VaultSubheading>Recently played tracks.</VaultSubheading>
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
            Nothing played yet. Your listening history will show up here.
          </Text>
        ) : null}

        {!isLoading && !errorMessage && data && data.length > 0 ? (
          <FlashList
            data={data}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <LibraryTrackRow
                showFavorite
                subtitle={`${formatArtists(item.track)} · ${formatPlayedAt(item.playedAt)}`}
                track={item.track}
              />
            )}
            showsVerticalScrollIndicator={false}
          />
        ) : null}
      </View>
    </Screen>
  );
}
