import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { frames, type InsertFrame } from "../drizzle/schema";

function createDb(d1: D1Database) {
  return drizzle(d1);
}

export async function listFrames(d1: D1Database) {
  const db = createDb(d1);
  return db.select().from(frames).orderBy(frames.createdAt);
}

export async function insertFrame(d1: D1Database, frame: InsertFrame) {
  const db = createDb(d1);
  await db.insert(frames).values(frame);
}

export async function deleteFrame(d1: D1Database, id: number) {
  const db = createDb(d1);
  const result = await db.select().from(frames).where(eq(frames.id, id)).limit(1);
  if (result.length === 0) return null;
  await db.delete(frames).where(eq(frames.id, id));
  return result[0];
}

