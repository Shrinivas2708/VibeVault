import { ObjectId, type Collection } from "mongodb";
import type {
  Favorite,
  HistoryEntry,
  TrackMetadata,
} from "@vibevault/types";
import { getDb } from "../lib/db";

interface FavoriteDocument {
  _id: ObjectId;
  userId: ObjectId;
  providerId: string;
  externalId: string;
  track: TrackMetadata;
  createdAt: Date;
}

interface HistoryDocument {
  _id: ObjectId;
  userId: ObjectId;
  track: TrackMetadata;
  playedAt: Date;
  durationPlayedMs?: number;
}

function favorites(): Collection<FavoriteDocument> {
  return getDb().collection<FavoriteDocument>("favorites");
}

function history(): Collection<HistoryDocument> {
  return getDb().collection<HistoryDocument>("history");
}

function trackKey(track: TrackMetadata) {
  return `${track.ref.providerId}:${track.ref.externalId}`;
}

function toFavorite(doc: FavoriteDocument): Favorite {
  return {
    id: doc._id.toHexString(),
    userId: doc.userId.toHexString(),
    track: doc.track,
    createdAt: doc.createdAt.toISOString(),
  };
}

function toHistoryEntry(doc: HistoryDocument): HistoryEntry {
  return {
    id: doc._id.toHexString(),
    userId: doc.userId.toHexString(),
    track: doc.track,
    playedAt: doc.playedAt.toISOString(),
    durationPlayedMs: doc.durationPlayedMs,
  };
}

export async function listFavorites(userId: string): Promise<Favorite[]> {
  if (!ObjectId.isValid(userId)) return [];

  const docs = await favorites()
    .find({ userId: new ObjectId(userId) })
    .sort({ createdAt: -1 })
    .toArray();

  return docs.map(toFavorite);
}

export async function addFavorite(
  userId: string,
  track: TrackMetadata,
): Promise<Favorite> {
  const userObjectId = new ObjectId(userId);
  const now = new Date();

  const existing = await favorites().findOne({
    userId: userObjectId,
    providerId: track.ref.providerId,
    externalId: track.ref.externalId,
  });

  if (existing) {
    return toFavorite(existing);
  }

  const doc: Omit<FavoriteDocument, "_id"> = {
    userId: userObjectId,
    providerId: track.ref.providerId,
    externalId: track.ref.externalId,
    track,
    createdAt: now,
  };

  const result = await favorites().insertOne(doc as FavoriteDocument);
  return toFavorite({ _id: result.insertedId, ...doc });
}

export async function removeFavorite(
  userId: string,
  providerId: string,
  externalId: string,
): Promise<boolean> {
  if (!ObjectId.isValid(userId)) return false;

  const result = await favorites().deleteOne({
    userId: new ObjectId(userId),
    providerId,
    externalId,
  });

  return result.deletedCount > 0;
}

export async function isFavorite(
  userId: string,
  track: TrackMetadata,
): Promise<boolean> {
  if (!ObjectId.isValid(userId)) return false;

  const doc = await favorites().findOne({
    userId: new ObjectId(userId),
    providerId: track.ref.providerId,
    externalId: track.ref.externalId,
  });

  return doc !== null;
}

export async function listHistory(
  userId: string,
  limit = 50,
): Promise<HistoryEntry[]> {
  if (!ObjectId.isValid(userId)) return [];

  const docs = await history()
    .find({ userId: new ObjectId(userId) })
    .sort({ playedAt: -1 })
    .limit(Math.min(limit * 3, 300))
    .toArray();

  const seen = new Set<string>();
  const entries: HistoryEntry[] = [];

  for (const doc of docs) {
    const key = trackKey(doc.track);
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push(toHistoryEntry(doc));
    if (entries.length >= limit) break;
  }

  return entries;
}

export async function recordHistory(
  userId: string,
  track: TrackMetadata,
  durationPlayedMs?: number,
): Promise<HistoryEntry> {
  const doc: Omit<HistoryDocument, "_id"> = {
    userId: new ObjectId(userId),
    track,
    playedAt: new Date(),
    durationPlayedMs,
  };

  const result = await history().insertOne(doc as HistoryDocument);
  return toHistoryEntry({ _id: result.insertedId, ...doc });
}
