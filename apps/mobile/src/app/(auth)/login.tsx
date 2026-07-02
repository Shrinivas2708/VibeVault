import { zodResolver } from "@hookform/resolvers/zod";
import { APP_NAME } from "@vibevault/config";
import { LoginRequestSchema } from "@vibevault/types";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { z } from "zod";
import {
  VaultButton,
  VaultHeading,
  VaultSubheading,
} from "@/components/ui/button";
import { VaultInput } from "@/components/ui/input";
import { Screen } from "@/components/ui/screen";
import { ApiClientError } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";

const loginFormSchema = LoginRequestSchema;
type LoginFormValues = z.infer<typeof loginFormSchema>;

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setErrorMessage(null);
    try {
      await login(values.email, values.password);
      router.replace("/(tabs)");
    } catch (error) {
      if (error instanceof ApiClientError) {
        setErrorMessage(error.message);
        return;
      }
      setErrorMessage("Something went wrong. Please try again.");
    }
  });

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center py-8"
          keyboardShouldPersistTaps="handled"
        >
          <View className="gap-8">
            <View>
              <VaultHeading  >Welcome back</VaultHeading>
              <VaultSubheading>Sign in to your {APP_NAME} account.</VaultSubheading>
            </View>

            <View className="gap-4">
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <VaultInput
                    autoComplete="email"
                    error={errors.email?.message}
                    keyboardType="email-address"
                    label="Email"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    placeholder="you@example.com"
                    value={value}
                  />
                )}
              />

              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <VaultInput
                    autoComplete="password"
                    error={errors.password?.message}
                    label="Password"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    placeholder="••••••••"
                    secureTextEntry
                    value={value}
                  />
                )}
              />
            </View>

            {errorMessage ? (
              <Text className="font-inter text-sm text-vault-negative">{errorMessage}</Text>
            ) : null}

            <VaultButton label="Sign in" loading={isSubmitting} onPress={onSubmit} />

            <View className="flex-row justify-center gap-1">
              <Text className="font-inter text-sm text-vault-muted">
                New here?
              </Text>
              <Link href="/(auth)/register">
                <Text className="font-inter-semibold text-sm text-vault-text">
                  Create account
                </Text>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
