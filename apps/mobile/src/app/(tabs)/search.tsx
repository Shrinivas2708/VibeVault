import { useCallback, useEffect, useMemo, useState } from "react";
import { Keyboard, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { SearchInput } from "@/components/search/search-input";
import { SearchMessage } from "@/components/search/search-message";
import { SearchResultsList } from "@/components/search/search-results-list";
import { LibraryHub } from "@/components/library/library-hub";
import { VaultHeading, VaultSubheading } from "@/components/ui/button";
import { Screen } from "@/components/ui/screen";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usePlayTrack } from "@/hooks/use-play-track";
import {
  SEARCH_MIN_QUERY_LENGTH,
  useUnifiedSearch,
} from "@/hooks/use-unified-search";
import { getErrorMessage } from "@/lib/error-message";
import { usePlayerStore } from "@/stores/player-store";

import type { TrackMetadata } from "@vibevault/types";

function activeTrackKey(track: TrackMetadata | null) {
  if (!track?.ref.providerId || !track.ref.externalId) {
    return null;
  }

  return `${track.ref.providerId}:${track.ref.externalId}`;
}

export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string }>();
  const [query, setQuery] = useState(
    typeof params.q === "string" ? params.q : "",
  );
  const debouncedQuery = useDebouncedValue(query, 400);

  useEffect(() => {
    if (typeof params.q === "string" && params.q.length > 0) {
      setQuery(params.q);
    }
  }, [params.q]);

  const { data, error, isLoading, isFetching, isError } =
    useUnifiedSearch(debouncedQuery);

  const playTrack = usePlayTrack();
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isResolving = usePlayerStore((state) => state.isResolving);
  const resolveError = usePlayerStore((state) => state.resolveError);
  const setResolveError = usePlayerStore((state) => state.setResolveError);

  const trimmedDebounced = debouncedQuery.trim();
  const showHint = query.trim().length === 0;
  const showMinLength =
    query.trim().length > 0 && trimmedDebounced.length < SEARCH_MIN_QUERY_LENGTH;
  const isDebouncing =
    query.trim() !== trimmedDebounced && query.trim().length >= SEARCH_MIN_QUERY_LENGTH;

  const resolvingTrackKey = useMemo(() => {
    if (!isResolving || !playTrack.variables) return null;
    const result = playTrack.variables;
    return `${result.providerId}:${result.ref.externalId}`;
  }, [isResolving, playTrack.variables]);

  const handlePressTrack = useCallback(
    (result: Parameters<typeof playTrack.mutate>[0]) => {
      Keyboard.dismiss();
      setResolveError(null);
      playTrack.mutate(result);
    },
    [playTrack, setResolveError],
  );

  const errorMessage =
    isError && trimmedDebounced.length >= SEARCH_MIN_QUERY_LENGTH
      ? getErrorMessage(error, "Search failed. Check your connection and try again.")
      : null;

  return (
    <Screen className="pt-2" padded={false}>
      <View className="px-6">
        <Text className="font-inter text-sm uppercase tracking-[2px] text-vault-accent">
          Discover
        </Text>
        <VaultHeading>Search</VaultHeading>
        <VaultSubheading>One query. YouTube, JioSaavn, Spotify.</VaultSubheading>
        <View className="mt-5">
          <SearchInput value={query} onChangeText={setQuery} />
        </View>
        <View className="mt-4">
          <LibraryHub />
        </View>
      </View>

      {resolveError ? (
        <View className="mx-6 mt-3 rounded-vault-lg border border-vault-negative/30 bg-vault-negative/10 px-4 py-3">
          <Text className="font-inter text-sm text-vault-negative">{resolveError}</Text>
        </View>
      ) : null}

      <View className="mt-5 flex-1 px-4">
        {showHint ? (
          <SearchMessage
            icon="search"
            subtitle="Try an artist, song, or vibe. JioSaavn is best for playback."
            title="What do you want to listen to?"
          />
        ) : null}

        {showMinLength ? (
          <SearchMessage
            icon="text"
            title={`Type at least ${SEARCH_MIN_QUERY_LENGTH} characters`}
          />
        ) : null}

        {isDebouncing ? (
          <SearchMessage icon="hourglass-outline" title="Searching…" />
        ) : null}

        {errorMessage && trimmedDebounced.length >= SEARCH_MIN_QUERY_LENGTH ? (
          <SearchMessage
            icon="cloud-offline-outline"
            subtitle="Check that the API is running and try again."
            title={errorMessage}
          />
        ) : null}

        {!showHint &&
        !showMinLength &&
        !isDebouncing &&
        !errorMessage &&
        trimmedDebounced.length >= SEARCH_MIN_QUERY_LENGTH ? (
          <SearchResultsList
            activeTrackKey={activeTrackKey(currentTrack)}
            isFetching={isFetching}
            isLoading={isLoading}
            providersFailed={data?.providersFailed ?? []}
            query={trimmedDebounced}
            resolvingTrackKey={resolvingTrackKey}
            results={data?.results ?? []}
            onPressTrack={handlePressTrack}
          />
        ) : null}
      </View>
    </Screen>
  );
}
