import { FlashList } from "@shopify/flash-list";
import type { SearchResult } from "@vibevault/types";
import { Text, View } from "react-native";
import { SearchMessage } from "./search-message";
import { SearchSkeleton } from "./search-skeleton";
import { TrackRow } from "./track-row";

interface SearchResultsListProps {
  results: SearchResult[];
  isLoading: boolean;
  isFetching: boolean;
  query: string;
  activeTrackKey?: string | null;
  resolvingTrackKey?: string | null;
  onPressTrack: (result: SearchResult) => void;
  providersFailed?: string[];
}

function trackKey(result: SearchResult) {
  return `${result.providerId}:${result.ref.externalId}`;
}

export function SearchResultsList({
  results,
  isLoading,
  isFetching,
  query,
  activeTrackKey,
  resolvingTrackKey,
  onPressTrack,
  providersFailed = [],
}: SearchResultsListProps) {
  if (isLoading || (isFetching && results.length === 0)) {
    return <SearchSkeleton />;
  }

  if (results.length === 0) {
    return (
      <SearchMessage
        subtitle="Try a different spelling or another artist."
        title={`No results for “${query}”`}
      />
    );
  }

  return (
    <View className="min-h-[200px] flex-1">
      {providersFailed.length > 0 ? (
        <View className="mb-3 rounded-vault-lg border border-vault-warning/30 bg-vault-warning/10 px-3 py-2">
          <Text className="font-inter text-xs text-vault-warning">
            Some providers are unavailable: {providersFailed.join(", ")}
          </Text>
        </View>
      ) : null}

      <FlashList<SearchResult>
        data={results}
        keyExtractor={(item) => trackKey(item)}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <TrackRow
            isActive={trackKey(item) === activeTrackKey}
            isResolving={trackKey(item) === resolvingTrackKey}
            result={item}
            onPress={onPressTrack}
          />
        )}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
