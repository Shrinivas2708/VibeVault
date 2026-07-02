import type { ReactNode } from "react";
import type { Edge } from "react-native-safe-area-context";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AmbientGlow } from "./ambient-glow";

interface ScreenProps {
  children: ReactNode;
  className?: string;
  padded?: boolean;
  ambient?: boolean;
  edges?: Edge[];
}

const DEFAULT_EDGES: Edge[] = ["top", "left", "right"];

export function Screen({
  children,
  className = "",
  padded = true,
  ambient = true,
  edges = DEFAULT_EDGES,
}: ScreenProps) {
  const content = (
    <SafeAreaView className={`flex-1 bg-vault-background ${className}`} edges={edges}>
      <View className={`min-h-0 flex-1 ${padded ? "px-6" : ""}`}>{children}</View>
    </SafeAreaView>
  );

  if (!ambient) {
    return content;
  }

  return <AmbientGlow>{content}</AmbientGlow>;
}

export function LoadingScreen() {
  return (
    <AmbientGlow>
      <View className="flex-1 items-center justify-center bg-vault-background">
        <ActivityIndicator color="#1ed760" size="large" />
      </View>
    </AmbientGlow>
  );
}
