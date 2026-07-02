import { BottomTabBar, type BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { View } from "react-native";
import { PlayerChrome } from "@/components/player/player-chrome";

export function TabBarWithPlayer(props: BottomTabBarProps) {
  return (
    <View className="bg-vault-background" style={{ overflow: "visible" }}>
      <PlayerChrome />
      <BottomTabBar {...props} />
    </View>
  );
}