import type { TrackMetadata } from "@vibevault/types";
import { create } from "zustand";
import { findDownloadJob, findDownloadRecord } from "@/lib/download-lookup";
import { isDownloadCancelledError } from "@/lib/download-errors";
import { getErrorMessage } from "@/lib/error-message";
import { resolvePlayableTrack } from "@/lib/resolve-playable-track";
import { downloadManager } from "@/services/download-manager";
import { trackKey } from "@/services/player-helpers";
import type { DownloadJobState, DownloadRecord } from "@/types/download-record";

interface DownloadState {
  records: DownloadRecord[];
  jobs: Record<string, DownloadJobState>;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  startDownload: (track: TrackMetadata) => Promise<void>;
  cancelDownload: (track: TrackMetadata) => Promise<void>;
  deleteDownload: (trackId: string) => Promise<void>;
  getDownloadRecord: (track: TrackMetadata) => DownloadRecord | null;
  isDownloaded: (track: TrackMetadata) => boolean;
  getJob: (track: TrackMetadata) => DownloadJobState | undefined;
}

function jobKeyForTrack(track: TrackMetadata) {
  return trackKey(track);
}

function removeJobsForKeys(jobs: Record<string, DownloadJobState>, keys: string[]) {
  const next = { ...jobs };
  for (const key of keys) {
    delete next[key];
  }
  return next;
}

function collectCancelKeys(
  records: DownloadRecord[],
  jobs: Record<string, DownloadJobState>,
  track: TrackMetadata,
) {
  const uiKey = jobKeyForTrack(track);
  const record = findDownloadRecord(records, track);
  const job = findDownloadJob(jobs, records, track);
  const keys = new Set<string>([uiKey]);

  if (record?.id) keys.add(record.id);
  if (record?.sourceTrackId) keys.add(record.sourceTrackId);
  if (job?.trackId) keys.add(job.trackId);

  return [...keys];
}

export const useDownloadStore = create<DownloadState>((set, get) => ({
  records: [],
  jobs: {},
  isHydrated: false,

  hydrate: async () => {
    const records = await downloadManager.hydrate();
    set({ records, isHydrated: true });
  },

  startDownload: async (sourceTrack) => {
    const uiKey = jobKeyForTrack(sourceTrack);

    set((state) => ({
      jobs: {
        ...state.jobs,
        [uiKey]: { trackId: uiKey, status: "downloading", progress: 0 },
      },
    }));

    try {
      const playable = await resolvePlayableTrack(sourceTrack);
      if (downloadManager.isCancelled([uiKey])) {
        set((state) => ({
          jobs: removeJobsForKeys(state.jobs, [uiKey]),
        }));
        return;
      }

      const downloadId = trackKey(playable);
      const record = await downloadManager.startDownload(
        playable,
        (progress) => {
          set((state) => ({
            jobs: {
              ...state.jobs,
              [uiKey]: {
                trackId: uiKey,
                status: "downloading",
                progress,
              },
            },
          }));
        },
        uiKey,
        {
          isCancelled: () => downloadManager.isCancelled([uiKey, downloadId]),
        },
      );

      set((state) => ({
        records: [
          record,
          ...state.records.filter(
            (item) => item.id !== record.id && item.sourceTrackId !== uiKey,
          ),
        ],
        jobs: {
          ...state.jobs,
          [uiKey]: { trackId: uiKey, status: "completed", progress: 1 },
        },
      }));
    } catch (error) {
      if (isDownloadCancelledError(error) || downloadManager.isCancelled([uiKey])) {
        set((state) => ({
          jobs: removeJobsForKeys(state.jobs, [uiKey]),
        }));
        return;
      }

      set((state) => ({
        jobs: {
          ...state.jobs,
          [uiKey]: {
            trackId: uiKey,
            status: "failed",
            progress: 0,
            error: getErrorMessage(error, "Download failed"),
          },
        },
      }));
      throw error;
    }
  },

  cancelDownload: async (track) => {
    const { records, jobs } = get();
    const keys = collectCancelKeys(records, jobs, track);

    await downloadManager.cancelDownload(keys);
    set((state) => ({
      jobs: removeJobsForKeys(state.jobs, keys),
    }));
  },

  deleteDownload: async (trackId) => {
    const record = get().records.find(
      (item) => item.id === trackId || item.sourceTrackId === trackId,
    );
    const storageId = record?.id ?? trackId;

    await downloadManager.deleteDownload(storageId);
    set((state) => ({
      records: state.records.filter(
        (item) => item.id !== storageId && item.sourceTrackId !== trackId,
      ),
      jobs: Object.fromEntries(
        Object.entries(state.jobs).filter(
          ([key]) => key !== trackId && key !== storageId && key !== record?.sourceTrackId,
        ),
      ),
    }));
  },

  getDownloadRecord: (track) => findDownloadRecord(get().records, track),

  isDownloaded: (track) => findDownloadRecord(get().records, track) !== null,

  getJob: (track) => findDownloadJob(get().jobs, get().records, track),
}));
