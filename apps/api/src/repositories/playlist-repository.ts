import { ObjectId, type Collection } from "mongodb";
import type {
  ImportedPlaylist,
  SavedPlaylist,
  SavedPlaylistSummary,
  TrackMetadata,
} from "@vibevault/types";
import { getDb } from "../lib/db";
import {
  sanitizeImportedPlaylist,
  sanitizeTrackMetadata,
} from "../providers/mappers";

export interface PlaylistDocument {
  _id: ObjectId;
  userId: ObjectId;
  name: string;
  description?: string;
  artworkUrl?: string;
  trackCount: number;
  sourceUrl: string;
  sourceProviderId: ImportedPlaylist["sourceProviderId"];
  tracks: ImportedPlaylist["tracks"];
  createdAt: Date;
  updatedAt: Date;
}

function playlists(): Collection<PlaylistDocument> {
  return getDb().collection<PlaylistDocument>("playlists");
}

function sanitizeStoredTracks(tracks: TrackMetadata[]): TrackMetadata[] {
  return tracks
    .map(sanitizeTrackMetadata)
    .filter((track): track is TrackMetadata => track !== null);
}

function toSummary(doc: PlaylistDocument): SavedPlaylistSummary {
  const tracks = sanitizeStoredTracks(doc.tracks);

  return {
    id: doc._id.toHexString(),
    userId: doc.userId.toHexString(),
    name: doc.name,
    description: doc.description ?? undefined,
    artworkUrl: doc.artworkUrl ?? undefined,
    trackCount: tracks.length,
    sourceUrl: doc.sourceUrl,
    sourceProviderId: doc.sourceProviderId,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function toSavedPlaylist(doc: PlaylistDocument): SavedPlaylist {
  const tracks = sanitizeStoredTracks(doc.tracks);

  return {
    ...toSummary(doc),
    tracks,
  };
}

export async function upsertPlaylistBySourceUrl(input: {
  userId: string;
  imported: ImportedPlaylist;
}): Promise<SavedPlaylist> {
  const now = new Date();
  const userObjectId = new ObjectId(input.userId);

  const imported = sanitizeImportedPlaylist(input.imported);

  const update = {
    name: imported.name,
    description: imported.description,
    artworkUrl: imported.artworkUrl,
    trackCount: imported.tracks.length,
    sourceProviderId: imported.sourceProviderId,
    tracks: imported.tracks,
    updatedAt: now,
  };

  const existing = await playlists().findOne({
    userId: userObjectId,
    sourceUrl: imported.sourceUrl,
  });

  if (existing) {
    await playlists().updateOne({ _id: existing._id }, { $set: update });
    const updated = await playlists().findOne({ _id: existing._id });
    return toSavedPlaylist(updated!);
  }

  const doc: Omit<PlaylistDocument, "_id"> = {
    userId: userObjectId,
    sourceUrl: imported.sourceUrl,
    createdAt: now,
    ...update,
  };

  const result = await playlists().insertOne(doc as PlaylistDocument);
  return toSavedPlaylist({ _id: result.insertedId, ...doc });
}

export async function listPlaylistsByUser(
  userId: string,
): Promise<SavedPlaylistSummary[]> {
  if (!ObjectId.isValid(userId)) return [];

  const docs = await playlists()
    .find({ userId: new ObjectId(userId) })
    .sort({ updatedAt: -1 })
    .toArray();

  return docs.map(toSummary);
}

export async function findPlaylistByIdForUser(
  userId: string,
  playlistId: string,
): Promise<SavedPlaylist | null> {
  if (!ObjectId.isValid(userId) || !ObjectId.isValid(playlistId)) {
    return null;
  }

  const doc = await playlists().findOne({
    _id: new ObjectId(playlistId),
    userId: new ObjectId(userId),
  });

  return doc ? toSavedPlaylist(doc) : null;
}
