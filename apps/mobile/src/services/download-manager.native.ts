import type { TrackMetadata } from "@vibevault/types";
import * as FileSystem from "expo-file-system/legacy";
import { downloadIndex } from "@/lib/download-index";
import { DownloadCancelledError } from "@/lib/download-errors";
import { musicApi } from "@/lib/music-api";
import { trackKey } from "@/services/player-helpers";
import type { DownloadRecord } from "@/types/download-record";

const DOWNLOADS_DIR = `${FileSystem.documentDirectory ?? ""}downloads/`;

const activeJobs = new Map<string, FileSystem.DownloadResumable>();
const partialPaths = new Map<string, string>();
const cancelledIds = new Set<string>();

function extensionForFormat(format: string) {
  if (format === "best") return "m4a";
  return format.replace(/^\./, "");
}

function buildLocalPaths(track: TrackMetadata, format: string) {
  const id = trackKey(track);
  const ext = extensionForFormat(format);
  const filename = `${id.replace(/:/g, "_")}.${ext}`;
  const localPath = `${DOWNLOADS_DIR}${filename}`;
  return { id, filename, localPath, fileUri: localPath };
}

async function ensureDownloadsDir() {
  const info = await FileSystem.getInfoAsync(DOWNLOADS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(DOWNLOADS_DIR, { intermediates: true });
  }
}

function isCancelled(
  downloadId: string,
  sourceTrackId?: string,
  isCancelledFn?: () => boolean,
) {
  if (isCancelledFn?.()) return true;
  if (cancelledIds.has(downloadId)) return true;
  if (sourceTrackId && cancelledIds.has(sourceTrackId)) return true;
  return false;
}

function assertNotCancelled(
  downloadId: string,
  sourceTrackId?: string,
  isCancelledFn?: () => boolean,
) {
  if (isCancelled(downloadId, sourceTrackId, isCancelledFn)) {
    throw new DownloadCancelledError();
  }
}

async function cleanupPartialFile(path?: string) {
  if (!path) return;
  try {
    await FileSystem.deleteAsync(path, { idempotent: true });
  } catch {
    // Ignore cleanup errors.
  }
}

export const downloadManager = {
  async hydrate() {
    return downloadIndex.loadAll();
  },

  getLocalRecord(trackId: string): DownloadRecord | null {
    return downloadIndex.getById(trackId);
  },

  getLocalRecordForTrack(track: TrackMetadata): DownloadRecord | null {
    const id = trackKey(track);
    const direct = downloadIndex.getById(id);
    if (direct) return direct;

    return (
      downloadIndex
        .loadAll()
        .find(
          (record) =>
            record.sourceTrackId === id ||
            (record.track.title === track.title &&
              record.track.artists[0]?.name === track.artists[0]?.name),
        ) ?? null
    );
  },

  isDownloaded(trackId: string) {
    return downloadIndex.getById(trackId) !== null;
  },

  async cancelDownload(keys: string[]) {
    for (const key of keys) {
      cancelledIds.add(key);
    }

    await Promise.all(
      [...activeJobs.entries()].map(async ([id, job]) => {
        if (!keys.includes(id) && !cancelledIds.has(id)) return;

        try {
          await job.pauseAsync();
        } catch {
          // Ignore pause errors while canceling.
        }

        activeJobs.delete(id);
        await cleanupPartialFile(partialPaths.get(id));
        partialPaths.delete(id);
      }),
    );
  },

  isCancelled(keys: string[]) {
    return keys.some((key) => cancelledIds.has(key));
  },

  async startDownload(
    track: TrackMetadata,
    onProgress?: (progress: number) => void,
    sourceTrackId?: string,
    options?: { isCancelled?: () => boolean },
  ): Promise<DownloadRecord> {
    const id = trackKey(track);
    assertNotCancelled(id, sourceTrackId, options?.isCancelled);

    const existing = downloadIndex.getById(id);

    if (existing) {
      const info = await FileSystem.getInfoAsync(existing.localPath);
      if (info.exists) {
        return existing;
      }
      downloadIndex.remove(id);
    }

    await ensureDownloadsDir();
    assertNotCancelled(id, sourceTrackId, options?.isCancelled);

    const manifest = await musicApi.resolveDownload({ trackRef: track.ref });
    assertNotCancelled(id, sourceTrackId, options?.isCancelled);

    const paths = buildLocalPaths(track, manifest.format);

    if (activeJobs.has(id)) {
      const current = downloadIndex.getById(id);
      if (current) return current;
    }

    const download = FileSystem.createDownloadResumable(
      manifest.url,
      paths.localPath,
      undefined,
      (progress) => {
        if (isCancelled(id, sourceTrackId, options?.isCancelled)) return;
        const total = progress.totalBytesExpectedToWrite;
        const written = progress.totalBytesWritten;
        if (total > 0) {
          onProgress?.(written / total);
        }
      },
    );

    activeJobs.set(id, download);
    partialPaths.set(id, paths.localPath);

    try {
      const result = await download.downloadAsync();
      assertNotCancelled(id, sourceTrackId, options?.isCancelled);

      if (!result?.uri) {
        throw new Error("Download failed");
      }

      const record: DownloadRecord = {
        id,
        sourceTrackId,
        track,
        localPath: result.uri,
        fileUri: result.uri,
        filename: paths.filename,
        format: manifest.format,
        sizeBytes: manifest.sizeBytes,
        downloadedAt: new Date().toISOString(),
      };

      downloadIndex.upsert(record);
      cancelledIds.delete(id);
      if (sourceTrackId) cancelledIds.delete(sourceTrackId);
      return record;
    } catch (error) {
      if (isCancelled(id, sourceTrackId, options?.isCancelled) || error instanceof DownloadCancelledError) {
        await cleanupPartialFile(paths.localPath);
        throw new DownloadCancelledError();
      }
      throw error;
    } finally {
      activeJobs.delete(id);
      partialPaths.delete(id);
    }
  },

  async deleteDownload(trackId: string): Promise<void> {
    const record = downloadIndex.getById(trackId);
    if (!record) return;

    const job = activeJobs.get(trackId);
    if (job) {
      try {
        await job.pauseAsync();
      } catch {
        // Ignore pause errors while canceling.
      }
      activeJobs.delete(trackId);
      await cleanupPartialFile(partialPaths.get(trackId));
      partialPaths.delete(trackId);
    }

    const info = await FileSystem.getInfoAsync(record.localPath);
    if (info.exists) {
      await FileSystem.deleteAsync(record.localPath, { idempotent: true });
    }

    downloadIndex.remove(trackId);
  },
};
