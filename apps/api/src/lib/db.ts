import { MongoClient, type Db } from "mongodb";
import { env } from "@vibevault/config/server";
import { logger } from "./logger";

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectDb(): Promise<Db> {
  if (db) return db;

  client = new MongoClient(env.MONGODB_URI);
  await client.connect();
  db = client.db();

  await ensureIndexes(db);

  logger.info({ uri: env.MONGODB_URI.replace(/\/\/.*@/, "//***@") }, "mongodb connected");

  return db;
}

export function getDb(): Db {
  if (!db) {
    throw new Error("Database not connected. Call connectDb() first.");
  }
  return db;
}

export async function disconnectDb(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

async function ensureIndexes(database: Db): Promise<void> {
  await database.collection("users").createIndex({ email: 1 }, { unique: true });
  await database
    .collection("refreshSessions")
    .createIndex({ jti: 1 }, { unique: true });
  await database
    .collection("refreshSessions")
    .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await database
    .collection("playlists")
    .createIndex({ userId: 1, updatedAt: -1 });
  await database
    .collection("playlists")
    .createIndex({ userId: 1, sourceUrl: 1 }, { unique: true });
}
