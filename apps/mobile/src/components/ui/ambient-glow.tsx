import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

interface AmbientGlowProps {
  children: ReactNode;
}

export function AmbientGlow({ children }: AmbientGlowProps) {
  return (
    <View className="flex-1 bg-vault-background">
      <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        <View
          className="absolute -left-16 -top-24 h-72 w-72 rounded-full bg-vault-accent"
          style={{ opacity: 0.07 }}
        />
        <View
          className="absolute -right-20 top-1/4 h-64 w-64 rounded-full bg-vault-announcement"
          style={{ opacity: 0.06 }}
        />
        <View
          className="absolute bottom-32 left-1/3 h-56 w-56 rounded-full bg-vault-accent"
          style={{ opacity: 0.04 }}
        />
      </View>
      {children}
    </View>
  );
}
