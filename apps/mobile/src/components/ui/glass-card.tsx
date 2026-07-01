import type { ReactNode } from "react";
import { Pressable, type PressableProps, View } from "react-native";

interface GlassCardProps extends PressableProps {
  children: ReactNode;
  active?: boolean;
  className?: string;
}

export function GlassCard({
  children,
  active = false,
  className = "",
  onPress,
  ...props
}: GlassCardProps) {
  const baseClass = `overflow-hidden rounded-vault-xl border bg-vault-surface-card/90 ${
    active
      ? "border-vault-accent/35 bg-vault-surface-elevated"
      : "border-vault-border"
  } ${className}`;

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        className={baseClass}
        onPress={onPress}
        {...props}
      >
        {children}
      </Pressable>
    );
  }

  return <View className={baseClass}>{children}</View>;
}
