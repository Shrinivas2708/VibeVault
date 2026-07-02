import { ERROR_CODES } from "@vibevault/config";
import type { ProviderId } from "@vibevault/types";
import { AppError } from "./errors";

export type ImportKind = "playlist" | "album" | "track";

export interface ImportTarget {
  providerId: ProviderId;
  kind: ImportKind;
}

type UrlRule = {
  providerId: ProviderId;
  kind: ImportKind;
  test: (url: string) => boolean;
};

const URL_RULES: UrlRule[] = [
  {
    providerId: "jiosaavn",
    kind: "track",
    test: (url) => /jiosaavn\.com\/song\//i.test(url),
  },
  {
    providerId: "jiosaavn",
    kind: "album",
    test: (url) => /jiosaavn\.com\/album\//i.test(url),
  },
  {
    providerId: "jiosaavn",
    kind: "playlist",
    test: (url) => /jiosaavn\.com\//i.test(url),
  },
  {
    providerId: "spotify",
    kind: "track",
    test: (url) => /spotify\.com\/track\//i.test(url),
  },
  {
    providerId: "spotify",
    kind: "album",
    test: (url) => /spotify\.com\/album\//i.test(url),
  },
  {
    providerId: "spotify",
    kind: "playlist",
    test: (url) => /spotify\.com\/playlist\//i.test(url),
  },
  {
    providerId: "youtube",
    kind: "playlist",
    test: (url) =>
      /(?:youtube\.com\/playlist\?list=|music\.youtube\.com\/playlist\?list=)/i.test(
        url,
      ) || (/(?:youtube\.com\/watch\?)/i.test(url) && /[?&]list=/.test(url)),
  },
  {
    providerId: "youtube",
    kind: "track",
    test: (url) =>
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|music\.youtube\.com\/watch\?v=)/i.test(
        url,
      ),
  },
];

export function detectImportTarget(url: string): ImportTarget {
  const trimmed = url.trim();

  for (const rule of URL_RULES) {
    if (rule.test(trimmed)) {
      return { providerId: rule.providerId, kind: rule.kind };
    }
  }

  throw new AppError(
    ERROR_CODES.VALIDATION_ERROR,
    "Paste a public Spotify, YouTube, or JioSaavn playlist, album, or song link",
    400,
  );
}

/** @deprecated Use detectImportTarget */
export function detectPlaylistProvider(url: string): ProviderId {
  return detectImportTarget(url).providerId;
}
