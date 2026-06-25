import { ObjectId, type Collection } from "mongodb";
import type { ImportedPlaylist, SavedPlaylist, SavedPlaylistSummary } from "@vibevault/types";
import { getDb } from "../lib/db";

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

function toSummary(doc: PlaylistDocument): SavedPlaylistSummary {
  return {
    id: doc._id.toHexString(),
    userId: doc.userId.toHexString(),
    name: doc.name,
    description: doc.description,
    artworkUrl: doc.artworkUrl,
    trackCount: doc.trackCount,
    sourceUrl: doc.sourceUrl,
    sourceProviderId: doc.sourceProviderId,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function toSavedPlaylist(doc: PlaylistDocument): SavedPlaylist {
  return {
    ...toSummary(doc),
    tracks: doc.tracks,
  };
}

export async function upsertPlaylistBySourceUrl(input: {
  userId: string;
  imported: ImportedPlaylist;
}): Promise<SavedPlaylist> {
  const now = new Date();
  const userObjectId = new ObjectId(input.userId);

  const update = {
    name: input.imported.name,
    description: input.imported.description,
    artworkUrl: input.imported.artworkUrl,
    trackCount: input.imported.tracks.length,
    sourceProviderId: input.imported.sourceProviderId,
    tracks: input.imported.tracks,
    updatedAt: now,
  };

  const existing = await playlists().findOne({
    userId: userObjectId,
    sourceUrl: input.imported.sourceUrl,
  });

  if (existing) {
    await playlists().updateOne({ _id: existing._id }, { $set: update });
    const updated = await playlists().findOne({ _id: existing._id });
    return toSavedPlaylist(updated!);
  }

  const doc: Omit<PlaylistDocument, "_id"> = {
    userId: userObjectId,
    sourceUrl: input.imported.sourceUrl,
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
