import {
  ProviderNotSupportedError,
  ProviderUnavailableError,
  assertCapability,
  type MusicProvider,
  type ProviderCapabilities,
} from "@vibevault/provider-core";
import type {
  DownloadManifest,
  DownloadOptions,
  ImportedPlaylist,
  SearchQuery,
  SearchResultPage,
  StreamManifest,
  StreamOptions,
  TrackMetadata,
  TrackRef,
} from "@vibevault/types";
import {
  extractorDownload,
  extractorMetadata,
  extractorPlaylist,
  extractorSearch,
  extractorStream,
  youtubeUrl,
} from "../clients/extractor-client";
import {
  buildSearchPage,
  extractorToMetadata,
  extractorToPlaylist,
  extractorToSearchResult,
} from "./mappers";

const capabilities: ProviderCapabilities = {
  search: true,
  metadata: true,
  streaming: true,
  playlistImport: true,
  download: true,
  video: true,
};

function wrapError(error: unknown): never {
  if (error instanceof ProviderNotSupportedError) throw error;
  throw new ProviderUnavailableError("youtube", error);
}

export function createYouTubeAdapter(): MusicProvider {
  return {
    id: "youtube",
    displayName: "YouTube",
    capabilities,

    async search(query: SearchQuery): Promise<SearchResultPage> {
      assertCapability(this, "search", "search");
      try {
        const tracks = await extractorSearch(query.query, query.limit);
        const results = tracks.map(extractorToSearchResult);
        return buildSearchPage("youtube", query, results, results.length);
      } catch (error) {
        wrapError(error);
      }
    },

    async getMetadata(ref: TrackRef): Promise<TrackMetadata> {
      assertCapability(this, "metadata", "getMetadata");
      try {
        const url = youtubeUrl(ref.externalId, ref.url);
        const track = await extractorMetadata(url);
        return extractorToMetadata(track);
      } catch (error) {
        wrapError(error);
      }
    },

    async resolveStream(
      ref: TrackRef,
      options?: StreamOptions,
    ): Promise<StreamManifest> {
      assertCapability(this, "streaming", "resolveStream");
      try {
        const url = youtubeUrl(ref.externalId, ref.url);
        const stream = await extractorStream(url, options?.preferVideo ?? false);
        return {
          trackRef: ref,
          deliveryMode: "direct",
          url: stream.url,
          expiresAt: new Date(stream.expires_at).toISOString(),
          mimeType: stream.mime_type ?? undefined,
          bitrate: stream.bitrate ?? undefined,
          isVideo: stream.is_video,
          headers: stream.headers ?? undefined,
        };
      } catch (error) {
        wrapError(error);
      }
    },

    async importPlaylist(url: string): Promise<ImportedPlaylist> {
      assertCapability(this, "playlistImport", "importPlaylist");
      try {
        const playlist = await extractorPlaylist(url);
        return extractorToPlaylist(playlist);
      } catch (error) {
        wrapError(error);
      }
    },

    async resolveDownload(
      ref: TrackRef,
      _options?: DownloadOptions,
    ): Promise<DownloadManifest> {
      assertCapability(this, "download", "resolveDownload");
      try {
        const url = youtubeUrl(ref.externalId, ref.url);
        const download = await extractorDownload(url);
        return {
          trackRef: ref,
          url: download.url,
          filename: download.filename,
          format: download.format,
          sizeBytes: download.size_bytes ?? undefined,
          expiresAt: download.expires_at ?? undefined,
        };
      } catch (error) {
        wrapError(error);
      }
    },
  };
}
