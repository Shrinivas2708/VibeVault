import { z } from "zod";
import { ProviderIdSchema } from "./provider";

export const TrackRefSchema = z.object({
  providerId: ProviderIdSchema,
  externalId: z.string().min(1),
  url: z.string().url().optional(),
});

export type TrackRef = z.infer<typeof TrackRefSchema>;

export const ArtistSummarySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
});

export type ArtistSummary = z.infer<typeof ArtistSummarySchema>;

export const AlbumSummarySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  artworkUrl: z.string().url().optional(),
});

export type AlbumSummary = z.infer<typeof AlbumSummarySchema>;

export const TrackMetadataSchema = z.object({
  ref: TrackRefSchema,
  title: z.string().min(1),
  artists: z.array(ArtistSummarySchema).min(1),
  album: AlbumSummarySchema.optional(),
  artworkUrl: z.string().url().optional(),
  durationMs: z.number().int().nonnegative().optional(),
  isVideo: z.boolean().default(false),
  releaseYear: z.number().int().optional(),
});

export type TrackMetadata = z.infer<typeof TrackMetadataSchema>;

export const SearchResultSchema = TrackMetadataSchema.extend({
  providerId: ProviderIdSchema,
  relevanceScore: z.number().min(0).max(1).optional(),
});

export type SearchResult = z.infer<typeof SearchResultSchema>;

export const SearchQuerySchema = z.object({
  query: z.string().min(1).max(200),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(50).default(20),
  types: z
    .array(z.enum(["track", "album", "playlist", "artist"]))
    .default(["track"]),
});

export type SearchQuery = z.infer<typeof SearchQuerySchema>;

export const PaginationMetaSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative().optional(),
  hasMore: z.boolean(),
});

export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

export const SearchResultPageSchema = z.object({
  results: z.array(SearchResultSchema),
  meta: PaginationMetaSchema,
  providersQueried: z.array(ProviderIdSchema),
  providersFailed: z.array(ProviderIdSchema).default([]),
});

export type SearchResultPage = z.infer<typeof SearchResultPageSchema>;

export const DeliveryModeSchema = z.enum(["direct", "proxied"]);

export type DeliveryMode = z.infer<typeof DeliveryModeSchema>;

export const StreamOptionsSchema = z.object({
  preferVideo: z.boolean().default(false),
  quality: z.enum(["low", "medium", "high"]).default("high"),
});

export type StreamOptions = z.infer<typeof StreamOptionsSchema>;

export const StreamManifestSchema = z.object({
  trackRef: TrackRefSchema,
  deliveryMode: DeliveryModeSchema.default("direct"),
  url: z.string().url(),
  expiresAt: z.string().datetime(),
  mimeType: z.string().optional(),
  bitrate: z.number().int().positive().optional(),
  isVideo: z.boolean().default(false),
  headers: z.record(z.string()).optional(),
});

export type StreamManifest = z.infer<typeof StreamManifestSchema>;

export const DownloadOptionsSchema = z.object({
  format: z.enum(["mp3", "m4a", "opus", "best"]).default("best"),
  quality: z.enum(["low", "medium", "high"]).default("high"),
});

export type DownloadOptions = z.infer<typeof DownloadOptionsSchema>;

export const DownloadManifestSchema = z.object({
  trackRef: TrackRefSchema,
  url: z.string().url(),
  filename: z.string().min(1),
  format: z.string().min(1),
  sizeBytes: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional(),
});

export type DownloadManifest = z.infer<typeof DownloadManifestSchema>;

export const PlaylistSummarySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  artworkUrl: z.string().url().optional(),
  trackCount: z.number().int().nonnegative().optional(),
  owner: z.string().optional(),
});

export type PlaylistSummary = z.infer<typeof PlaylistSummarySchema>;

export const ImportedPlaylistSchema = PlaylistSummarySchema.extend({
  sourceUrl: z.string().url(),
  sourceProviderId: ProviderIdSchema,
  tracks: z.array(TrackMetadataSchema),
});

export type ImportedPlaylist = z.infer<typeof ImportedPlaylistSchema>;

export const ImportPlaylistRequestSchema = z.object({
  url: z.string().url(),
});

export type ImportPlaylistRequest = z.infer<typeof ImportPlaylistRequestSchema>;

export const SavedPlaylistSummarySchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  artworkUrl: z.string().url().optional(),
  trackCount: z.number().int().nonnegative(),
  sourceUrl: z.string().url(),
  sourceProviderId: ProviderIdSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type SavedPlaylistSummary = z.infer<typeof SavedPlaylistSummarySchema>;

export const SavedPlaylistSchema = SavedPlaylistSummarySchema.extend({
  tracks: z.array(TrackMetadataSchema),
});

export type SavedPlaylist = z.infer<typeof SavedPlaylistSchema>;

export const ResolveStreamRequestSchema = z.object({
  trackRef: TrackRefSchema,
  options: StreamOptionsSchema.optional(),
});

export type ResolveStreamRequest = z.infer<typeof ResolveStreamRequestSchema>;

export const ResolveDownloadRequestSchema = z.object({
  trackRef: TrackRefSchema,
  options: DownloadOptionsSchema.optional(),
});

export type ResolveDownloadRequest = z.infer<
  typeof ResolveDownloadRequestSchema
>;

export const FavoriteSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  track: TrackMetadataSchema,
  createdAt: z.string().datetime(),
});

export type Favorite = z.infer<typeof FavoriteSchema>;

export const HistoryEntrySchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  track: TrackMetadataSchema,
  playedAt: z.string().datetime(),
  durationPlayedMs: z.number().int().nonnegative().optional(),
});

export type HistoryEntry = z.infer<typeof HistoryEntrySchema>;

export const AddFavoriteRequestSchema = z.object({
  track: TrackMetadataSchema,
});

export type AddFavoriteRequest = z.infer<typeof AddFavoriteRequestSchema>;

export const RecordHistoryRequestSchema = z.object({
  track: TrackMetadataSchema,
  durationPlayedMs: z.number().int().nonnegative().optional(),
});

export type RecordHistoryRequest = z.infer<typeof RecordHistoryRequestSchema>;

export const HistoryQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export type HistoryQuery = z.infer<typeof HistoryQuerySchema>;
