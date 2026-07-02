import type { TrackMetadata } from "@vibevault/types";
import { downloadIndex } from "@/lib/download-index";
import type { DownloadRecord } from "@/types/download-record";

export const downloadManager = {
  async hydrate() {
    return downloadIndex.loadAll();
  },

  getLocalRecord(trackId: string): DownloadRecord | null {
    return downloadIndex.getById(trackId);
  },

  getLocalRecordForTrack(_track: TrackMetadata): DownloadRecord | null {
    return null;
  },

  isDownloaded(trackId: string) {
    return downloadIndex.getById(trackId) !== null;
  },

  async cancelDownload(_keys: string[]) {},

  isCancelled(_keys: string[]) {
    return false;
  },

  async startDownload(
    _track: TrackMetadata,
    _onProgress?: (progress: number) => void,
    _sourceTrackId?: string,
    _options?: { isCancelled?: () => boolean },
  ): Promise<DownloadRecord> {
    throw new Error("Downloads are not supported on web.");
  },

  async deleteDownload(_trackId: string): Promise<void> {
    throw new Error("Downloads are not supported on web.");
  },
};
