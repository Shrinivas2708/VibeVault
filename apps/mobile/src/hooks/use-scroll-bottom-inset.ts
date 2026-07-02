import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePlayerStore } from "@/stores/player-store";

const TAB_BAR_HEIGHT = 56;
const MINI_PLAYER_HEIGHT = 64;

export function useScrollBottomInset(extra = 12) {
  const insets = useSafeAreaInsets();
  const hasMiniPlayer = usePlayerStore((state) => state.currentTrack !== null);
  return TAB_BAR_HEIGHT + insets.bottom + (hasMiniPlayer ? MINI_PLAYER_HEIGHT : 0) + extra;
}
