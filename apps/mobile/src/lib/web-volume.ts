const STORAGE_KEY = "vibevault-volume";

function getVolumeStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  const storage = window.sessionStorage;
  if (!storage || typeof storage.getItem !== "function") return null;
  return storage;
}

export function loadWebVolume(): number {
  const storage = getVolumeStorage();
  if (!storage) return 1;

  const stored = storage.getItem(STORAGE_KEY);
  if (!stored) return 1;

  const value = Number.parseFloat(stored);
  if (!Number.isFinite(value)) return 1;

  return Math.min(1, Math.max(0, value));
}

export function saveWebVolume(volume: number) {
  const storage = getVolumeStorage();
  if (!storage) return;
  storage.setItem(STORAGE_KEY, String(volume));
}
