import type { DownloadRecord } from "@/types/download-record";
import { formatDuration } from "@vibevault/utils";
import { Ionicons } from "@expo/vector-icons";
import { ArtworkImage } from "@/components/ui/artwork-image";
import * as Haptics from "expo-haptics";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { DownloadProgressBar } from "@/components/downloads/download-progress-bar";
import { usePlayDownloadedTrack } from "@/hooks/use-play-downloaded-track";
import { useDownloadStatus } from "@/hooks/use-download-status";
import { formatArtists } from "@/lib/track-format";
import { trackKey, usePlayerStore } from "@/stores/player-store";
import { useDownloadStore } from "@/stores/download-store";

interface DownloadRowProps {
  record: DownloadRecord;
}

export function DownloadRow({ record }: DownloadRowProps) {
  const deleteDownload = useDownloadStore((state) => state.deleteDownload);
  const cancelDownload = useDownloadStore((state) => state.cancelDownload);
  const playDownloaded = usePlayDownloadedTrack();
  const { isDownloading, progress } = useDownloadStatus(record.track);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const isResolving = usePlayerStore((state) => state.isResolving);

  const isActive = currentTrack ? trackKey(currentTrack) === record.id : false;
  const isResolvingThis =
    isResolving && playDownloaded.variables
      ? trackKey(playDownloaded.variables) === record.id
      : false;

  const handlePlay = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    playDownloaded.mutate(record.track);
  };

  const handleDelete = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    void deleteDownload(record.id);
  };

  const handleCancel = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void cancelDownload(record.track);
  };

  return (
    <View className="rounded-vault-lg bg-vault-surface-elevated px-2 py-2">
      <View className="flex-row items-center gap-3">
        <Pressable
          accessibilityRole="button"
          className="min-w-0 flex-1 flex-row items-center gap-3"
          onPress={handlePlay}
        >
          <ArtworkImage
            label={`${record.track.title} artwork`}
            radius={8}
            size={48}
            uri={record.track.artworkUrl}
          />

          <View className="min-w-0 flex-1">
            <Text className="font-inter-semibold text-base text-vault-text" numberOfLines={1}>
              {record.track.title}
            </Text>
            <Text className="font-inter text-sm text-vault-muted" numberOfLines={1}>
              {formatArtists(record.track)}
            </Text>
            {record.track.durationMs !== undefined ? (
              <Text className="mt-1 font-inter text-xs text-vault-muted">
                {formatDuration(record.track.durationMs)} · Offline
              </Text>
            ) : null}
          </View>
        </Pressable>

        <View className="flex-row items-center gap-1">
          {isResolvingThis ? (
            <ActivityIndicator color="#1ed760" size="small" />
          ) : null}
          {isDownloading ? (
            <Pressable
              accessibilityLabel="Cancel download"
              accessibilityRole="button"
              className="p-2"
              onPress={handleCancel}
            >
              <Ionicons color="#f3727f" name="close-circle" size={20} />
            </Pressable>
          ) : (
            <Pressable
              accessibilityLabel="Delete download"
              accessibilityRole="button"
              className="p-2"
              onPress={handleDelete}
            >
              <Ionicons color="#b3b3b3" name="trash-outline" size={20} />
            </Pressable>
          )}
        </View>
      </View>

      {isDownloading ? (
        <View className="mt-2 px-2">
          <DownloadProgressBar progress={progress} showPercent />
        </View>
      ) : null}

      {isActive ? (
        <Text className="mt-1 px-2 font-inter text-xs text-vault-accent">Now playing</Text>
      ) : null}
    </View>
  );
}
