import { usePlayerStore } from "@/stores/player-store";

const TAB_BAR_HEIGHT = 64;
const MINI_PLAYER_HEIGHT = 72;

export function useScrollBottomInset(extra = 20) {
  const hasMiniPlayer = usePlayerStore((state) => state.currentTrack !== null);
  return TAB_BAR_HEIGHT + (hasMiniPlayer ? MINI_PLAYER_HEIGHT : 0) + extra;
}
