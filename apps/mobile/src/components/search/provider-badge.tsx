import { Ionicons } from "@expo/vector-icons";
import type { ProviderId } from "@vibevault/types";
import { Text, View } from "react-native";

const PROVIDER_LABELS: Record<ProviderId, string> = {
  youtube: "YouTube",
  jiosaavn: "JioSaavn",
  spotify: "Spotify",
};

const PROVIDER_COLORS: Record<ProviderId, string> = {
  youtube: "#ff4b4b",
  jiosaavn: "#1ed760",
  spotify: "#1db954",
};

interface ProviderBadgeProps {
  providerId: ProviderId;
}

export function ProviderBadge({ providerId }: ProviderBadgeProps) {
  const color = PROVIDER_COLORS[providerId];

  return (
    <View
      className="self-start rounded-vault-pill border px-2 py-0.5"
      style={{
        backgroundColor: `${color}18`,
        borderColor: `${color}44`,
      }}
    >
      <Text
        className="font-inter-semibold text-micro uppercase tracking-wider"
        style={{ color }}
      >
        {PROVIDER_LABELS[providerId]}
      </Text>
    </View>
  );
}

export function ProviderIcon({ providerId, size = 14 }: { providerId: ProviderId; size?: number }) {
  const color = PROVIDER_COLORS[providerId];
  const icon =
    providerId === "youtube"
      ? "logo-youtube"
      : providerId === "spotify"
        ? "musical-notes"
        : "radio";

  return <Ionicons color={color} name={icon} size={size} />;
}
