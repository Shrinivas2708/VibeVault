import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Pressable, Text, View } from "react-native";
import { useFavorites } from "@/hooks/use-favorites";
import { useHistory } from "@/hooks/use-history";
import { useDownloadStore } from "@/stores/download-store";

interface HubItem {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  count?: number;
  href: string;
}

export function LibraryHub() {
  const router = useRouter();
  const { data: favorites } = useFavorites();
  const { data: history } = useHistory(50);
  const downloadCount = useDownloadStore((state) => state.records.length);

  const items: HubItem[] = [
    {
      label: "Likes",
      icon: "heart",
      tint: "#f3727f",
      count: favorites?.length ?? 0,
      href: "/(tabs)/library/favorites",
    },
    {
      label: "History",
      icon: "time",
      tint: "#ffa42b",
      count: history?.length ?? 0,
      href: "/(tabs)/library/history",
    },
    {
      label: "Downloads",
      icon: "download-outline",
      tint: "#539df5",
      count: downloadCount,
      href: "/(tabs)/library/downloads",
    },
    {
      label: "Import",
      icon: "add-circle-outline",
      tint: "#1ed760",
      href: "/(tabs)/library/import",
    },
  ];

  return (
    <View className="flex-row gap-2">
      {items.map((item) => (
        <Pressable
          key={item.label}
          accessibilityRole="button"
          className="min-w-0 flex-1 items-center rounded-vault-xl border border-vault-border bg-vault-surface-card/90 px-2 py-3"
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push(item.href as never);
          }}
        >
          <View
            className="mb-2 h-9 w-9 items-center justify-center rounded-full"
            style={{ backgroundColor: `${item.tint}22` }}
          >
            <Ionicons color={item.tint} name={item.icon} size={18} />
          </View>
          <Text className="font-inter-semibold text-xs text-vault-text">{item.label}</Text>
          {item.count !== undefined ? (
            <Text className="mt-0.5 font-inter text-micro text-vault-muted">{item.count}</Text>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}
