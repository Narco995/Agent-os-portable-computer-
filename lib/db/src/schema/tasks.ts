import { pgTable, text, timestamp, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tasksTable = pgTable("tasks", {
  id: text("id").primaryKey(),
  agentId: text("agent_id"),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("pending"),
  steps: jsonb("steps").notNull().$type<Array<{ id: string; description: string; status: string; commandType: string; result?: string }>>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  progress: real("progress").notNull().default(0),
});

export const insertTaskSchema = createInsertSchema(tasksTable).omit({ createdAt: true, completedAt: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;
