import { BottomTabBar, type BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PlayerChrome } from "@/components/player/player-chrome";

export function TabBarWithPlayer(props: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View className="bg-vault-background" style={{ overflow: "visible", paddingBottom: insets.bottom }}>
      <PlayerChrome />
      <View className="border-t border-vault-border bg-vault-backgroundSoft/95">
        <BottomTabBar {...props} />
      </View>
    </View>
  );
}
