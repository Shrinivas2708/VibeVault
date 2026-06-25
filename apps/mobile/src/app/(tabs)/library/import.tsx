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

export default function ImportPlaylistScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ImportFormValues>({
    resolver: zodResolver(importSchema),
    defaultValues: { url: "" },
  });

  const importMutation = useMutation({
    mutationFn: (url: string) => playlistApi.importSpotify(url),
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
      <VaultHeading>Import playlist</VaultHeading>
      <VaultSubheading>Paste a public Spotify playlist link.</VaultSubheading>

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
              label="Spotify playlist URL"
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="https://open.spotify.com/playlist/..."
              value={value}
            />
          )}
        />

        {errorMessage ? (
          <Text className="font-inter text-sm text-vault-negative">{errorMessage}</Text>
        ) : null}

        <VaultButton
          label="Import"
          loading={isSubmitting || importMutation.isPending}
          onPress={onSubmit}
        />
      </View>
    </Screen>
  );
}
