import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const frames = sqliteTable("frames", {
  id: int("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  imageUrl: text("imageUrl").notNull(),
  createdAt: int("createdAt")
    .$defaultFn(() => Date.now())
    .notNull(),
});

export type Frame = typeof frames.$inferSelect;
export type InsertFrame = typeof frames.$inferInsert;
