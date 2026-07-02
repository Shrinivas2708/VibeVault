export class DownloadCancelledError extends Error {
  constructor() {
    super("Download cancelled");
    this.name = "DownloadCancelledError";
  }
}

export function isDownloadCancelledError(error: unknown) {
  return error instanceof DownloadCancelledError;
}
