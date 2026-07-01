import { zodResolver } from "@hookform/resolvers/zod";
import { ImportPlaylistRequestSchema } from "@vibevault/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Text, View } from "react-native";
import { z } from "zod";
import { VaultButton, VaultHeading, VaultSubheading } from "@/components/ui/button";
import { VaultInput } from "@/components/ui/input";
import { Screen } from "@/components/ui/screen";
import { ApiClientError } from "@/lib/api-client";
import { playlistApi } from "@/lib/playlist-api";

const importSchema = ImportPlaylistRequestSchema;
type ImportFormValues = z.infer<typeof importSchema>;

const EXAMPLES = [
  {
    label: "Spotify",
    placeholder: "https://open.spotify.com/playlist/...",
    tint: "#1db954",
  },
  {
    label: "YouTube",
    placeholder: "https://www.youtube.com/playlist?list=...",
    tint: "#ff4b4b",
  },
] as const;

export default function ImportPlaylistScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeExample, setActiveExample] = useState<0 | 1>(0);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ImportFormValues>({
    resolver: zodResolver(importSchema),
    defaultValues: { url: "" },
  });

  const importMutation = useMutation({
    mutationFn: (url: string) => playlistApi.importPlaylist(url),
    onSuccess: async (playlist) => {
      await queryClient.invalidateQueries({ queryKey: ["playlists"] });
      router.replace(`/(tabs)/library/${playlist.id}`);
    },
    onError: (error) => {
      if (error instanceof ApiClientError) {
        setErrorMessage(error.message);
        return;
      }
      setErrorMessage("Could not import playlist. Check the URL and try again.");
    },
  });

  const onSubmit = handleSubmit((values) => {
    setErrorMessage(null);
    importMutation.mutate(values.url);
  });

  return (
    <Screen className="pt-4">
      <Text className="font-inter text-sm uppercase tracking-[2px] text-vault-accent">
        Library
      </Text>
      <VaultHeading>Import playlist</VaultHeading>
      <VaultSubheading>
        Paste a public Spotify or YouTube playlist link. Tracks import with artwork and
        metadata.
      </VaultSubheading>

      <View className="mt-6 flex-row gap-2">
        {EXAMPLES.map((example, index) => (
          <VaultButton
            key={example.label}
            className="flex-1"
            label={example.label}
            uppercase={false}
            variant={activeExample === index ? "primary" : "secondary"}
            onPress={() => setActiveExample(index as 0 | 1)}
          />
        ))}
      </View>

      <View className="mt-8 gap-4">
        <Controller
          control={control}
          name="url"
          render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => (
            <VaultInput
              autoCapitalize="none"
              autoCorrect={false}
              error={error?.message}
              keyboardType="url"
              label={`${EXAMPLES[activeExample].label} playlist URL`}
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder={EXAMPLES[activeExample].placeholder}
              value={value}
            />
          )}
        />

        {errorMessage ? (
          <Text className="font-inter text-sm text-vault-negative">{errorMessage}</Text>
        ) : null}

        <VaultButton
          label="Import playlist"
          loading={isSubmitting || importMutation.isPending}
          onPress={onSubmit}
        />

        <Text className="font-inter text-xs leading-5 text-vault-muted">
          Spotify playlists are metadata-only (play via JioSaavn/YouTube search). YouTube
          playlists can be played directly in VibeVault.
        </Text>
      </View>
    </Screen>
  );
}
