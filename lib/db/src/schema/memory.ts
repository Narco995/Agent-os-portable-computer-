import { pgTable, text, timestamp, real, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const memoriesTable = pgTable("memories", {
  id: text("id").primaryKey(),
  agentId: text("agent_id"),
  type: text("type").notNull().default("episodic"),
  content: text("content").notNull(),
  tags: jsonb("tags").notNull().$type<string[]>().default([]),
  importance: real("importance").notNull().default(0.5),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMemorySchema = createInsertSchema(memoriesTable).omit({ createdAt: true });
export type InsertMemory = z.infer<typeof insertMemorySchema>;
export type Memory = typeof memoriesTable.$inferSelect;
