import * as Haptics from "expo-haptics";
import type { ReactNode } from "react";
import {
  Pressable,
  type PressableProps,
  Text,
  type TextStyle,
} from "react-native";

type VaultButtonVariant = "primary" | "secondary" | "ghost";

interface VaultButtonProps extends PressableProps {
  label: string;
  variant?: VaultButtonVariant;
  loading?: boolean;
  uppercase?: boolean;
}

const variantClasses: Record<VaultButtonVariant, string> = {
  primary: "bg-vault-accent",
  secondary: "bg-vault-surface-elevated",
  ghost: "bg-transparent",
};

const textClasses: Record<VaultButtonVariant, string> = {
  primary: "text-black",
  secondary: "text-vault-text",
  ghost: "text-vault-muted",
};

export function VaultButton({
  label,
  variant = "primary",
  loading = false,
  uppercase = true,
  disabled,
  onPress,
  className = "",
  ...props
}: VaultButtonProps) {
  const handlePress: PressableProps["onPress"] = (event) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.(event);
  };

  return (
    <Pressable
      accessibilityRole="button"
      className={`items-center justify-center rounded-vault-pill px-5 py-3.5 ${variantClasses[variant]} ${disabled || loading ? "opacity-50" : ""} ${className}`}
      disabled={disabled || loading}
      onPress={handlePress}
      {...props}
    >
      <Text
        className={`font-inter-bold text-sm ${textClasses[variant]} ${uppercase ? "uppercase tracking-widest" : ""}`}
        style={{ letterSpacing: uppercase ? 1.4 : 0 } as TextStyle}
      >
        {loading ? "Please wait…" : label}
      </Text>
    </Pressable>
  );
}

interface VaultTextLinkProps {
  label: string;
  onPress: () => void;
}

export function VaultTextLink({ label, onPress }: VaultTextLinkProps) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress}>
      <Text className="font-inter text-sm text-vault-muted underline">
        {label}
      </Text>
    </Pressable>
  );
}

interface VaultHeadingProps {
  children: ReactNode;
}

export function VaultHeading({ children }: VaultHeadingProps, className?: string) {
  return (
    <Text className={`mt-1 font-jakarta-bold text-4xl tracking-tight text-vault-text font-bold ${className}`}>
      {children}
    </Text>
  );
}

export function VaultSubheading({ children }: VaultHeadingProps) {
  return (
    <Text className="mt-2 font-inter text-sm leading-6 text-vault-muted">
      {children}
    </Text>
  );
}
