import { pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const virtualFilesTable = pgTable("virtual_files", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  path: text("path").notNull(),
  type: text("type").notNull().default("file"),
  content: text("content").default(""),
  size: integer("size").default(0),
  mimeType: text("mime_type").default("text/plain"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertVirtualFileSchema = createInsertSchema(virtualFilesTable).omit({ createdAt: true, updatedAt: true });
export type InsertVirtualFile = z.infer<typeof insertVirtualFileSchema>;
export type VirtualFile = typeof virtualFilesTable.$inferSelect;
