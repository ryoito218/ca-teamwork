import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const frames = sqliteTable("frames", {
  id: int("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  imageUrl: text("imageUrl").notNull(),
  fileKey: text("fileKey").notNull(),
  createdAt: int("createdAt", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
});

export type Frame = typeof frames.$inferSelect;
export type InsertFrame = typeof frames.$inferInsert;
