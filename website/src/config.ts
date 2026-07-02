/**
 * Site download config.
 *
 * Local dev:  run `bun run website:sync-apk` to copy the latest build into public/downloads/
 * Production: set VITE_APK_URL to the full HTTPS URL, or edit defaults below.
 */
export const siteConfig = {
  apkUrl: import.meta.env.VITE_APK_URL ?? "https://github.com/Shrinivas2708/OneTune/releases/download/v1.0.0/OneTune-1.0.0.apk",
  apkFileName: import.meta.env.VITE_APK_FILE_NAME ?? "OneTune-1.0.0.apk",
} as const;
