import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { QuickTile } from "@/components/home/quick-tile";
import { LibraryHub } from "@/components/library/library-hub";
import { LibraryTrackRow } from "@/components/library/library-track-row";
import { ArtworkImage } from "@/components/ui/artwork-image";
import { VaultHeading, VaultSubheading } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Screen } from "@/components/ui/screen";
import { useHistory } from "@/hooks/use-history";
import { useScrollBottomInset } from "@/hooks/use-scroll-bottom-inset";
import { useAuthStore } from "@/stores/auth-store";
import { usePlayerStore } from "@/stores/player-store";

const MOOD_SEARCHES = ["seedhe maut", "manto", "arijit singh", "lofi"];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { data: history } = useHistory(6);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const bottomInset = useScrollBottomInset();

  return (
    <Screen className="pt-2" padded={false}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: bottomInset }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-6 pt-2">
          <VaultHeading>{getGreeting()}</VaultHeading>
          <VaultSubheading>
            {user?.displayName
              ? `Back on the decks, ${user.displayName}`
              : "Your music, every provider, one tune"}
          </VaultSubheading>
        </View>

        <View className="mt-6 flex-row gap-3 px-6">
          <QuickTile
            icon="search"
            subtitle="All providers"
            tint="#1ed760"
            title="Search"
            onPress={() => router.push("/(tabs)/search")}
          />
          <QuickTile
            icon="heart"
            subtitle="Saved tracks"
            tint="#f3727f"
            title="Likes"
            onPress={() => router.push("/(tabs)/library/favorites")}
          />
        </View>

        <View className="mt-3 flex-row gap-3 px-6">
          <QuickTile
            icon="download-outline"
            subtitle="Offline mode"
            tint="#539df5"
            title="Downloads"
            onPress={() => router.push("/(tabs)/library/downloads")}
          />
          <QuickTile
            icon="time-outline"
            subtitle="Recently played"
            tint="#ffa42b"
            title="History"
            onPress={() => router.push("/(tabs)/library/history")}
          />
        </View>

        <View className="mt-6 px-6">
          <Text className="mb-3 font-jakarta text-lg text-vault-text">Your vault</Text>
          <LibraryHub />
        </View>

        <View className="mt-8 px-6">
          <Text className="font-jakarta text-lg text-vault-text">Jump in</Text>
          <ScrollView
            horizontal
            className="mt-3"
            contentContainerClassName="gap-2 pr-6"
            showsHorizontalScrollIndicator={false}
          >
            {MOOD_SEARCHES.map((term) => (
              <Pressable
                key={term}
                accessibilityRole="button"
                className="rounded-vault-pill bg-vault-surface-elevated px-4 py-2.5"
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/search",
                    params: { q: term },
                  })
                }
              >
                <Text className="font-inter-semibold text-sm capitalize text-vault-text">
                  {term}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {currentTrack ? (
          <View className="mt-8 px-6">
            <Text className="font-jakarta text-lg text-vault-text">Now playing</Text>
            <GlassCard active className="mt-3 bg-vault-surface">
              <View className="flex-row items-center gap-3 p-3">
                <ArtworkImage
                  label={`${currentTrack.title} artwork`}
                  radius={12}
                  size={64}
                  uri={currentTrack.artworkUrl}
                />
                <View className="min-w-0 flex-1">
                  <Text
                    className="font-inter-semibold text-base text-vault-text"
                    numberOfLines={1}
                  >
                    {currentTrack.title}
                  </Text>
                  <Text className="mt-1 font-inter text-sm text-vault-muted" numberOfLines={1}>
                    {currentTrack.artists.map((artist) => artist.name).join(", ")}
                  </Text>
                </View>
              </View>
            </GlassCard>
          </View>
        ) : null}

        {history && history.length > 0 ? (
          <View className="mt-8 px-4">
            <View className="mb-3 flex-row items-center justify-between px-2">
              <Text className="font-jakarta text-lg text-vault-text">Pick up where you left off</Text>
              <Pressable onPress={() => router.push("/(tabs)/library/history")}>
                <Text className="font-inter-semibold text-sm text-vault-accent">See all</Text>
              </Pressable>
            </View>
            {history.slice(0, 4).map((entry) => (
              <LibraryTrackRow
                key={entry.id}
                showDownload={false}
                track={entry.track}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
