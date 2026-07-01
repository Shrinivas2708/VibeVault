import { BottomTabBar, type BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { View } from "react-native";
import { PlayerChrome } from "@/components/player/player-chrome";

export function TabBarWithPlayer(props: BottomTabBarProps) {
  return (
    <View className="bg-vault-background">
      <PlayerChrome />
      <View className="border-t border-vault-border bg-vault-backgroundSoft/95">
        <BottomTabBar {...props} />
      </View>
    </View>
  );
}
