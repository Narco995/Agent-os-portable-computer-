import { Router, type IRouter } from "express";
import { db, virtualFilesTable } from "@workspace/db";
import { eq, like, and } from "drizzle-orm";
import { randomUUID } from "crypto";

const router: IRouter = Router();

function serialize(f: typeof virtualFilesTable.$inferSelect) {
  return {
    ...f,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  };
}

router.get("/files", async (req, res) => {
  const pathPrefix = (req.query.path as string) ?? "/";
  const files = await db.select().from(virtualFilesTable)
    .where(like(virtualFilesTable.path, `${pathPrefix}%`));
  res.json(files.map(serialize));
});

router.post("/files", async (req, res) => {
  const { name, path, type = "file", content = "", mimeType = "text/plain" } = req.body;
  if (!name || !path) {
    res.status(400).json({ error: "name and path are required" });
    return;
  }
  const id = randomUUID();
  const [file] = await db.insert(virtualFilesTable).values({
    id, name, path, type,
    content: type === "directory" ? "" : content,
    size: content?.length ?? 0,
    mimeType: type === "directory" ? "inode/directory" : mimeType,
  }).returning();
  res.status(201).json(serialize(file));
});

router.get("/files/:fileId", async (req, res) => {
  const [file] = await db.select().from(virtualFilesTable).where(eq(virtualFilesTable.id, req.params.fileId));
  if (!file) { res.status(404).json({ error: "Not found" }); return; }
  res.json(serialize(file));
});

router.put("/files/:fileId", async (req, res) => {
  const { content, name } = req.body;
  const updates: Partial<typeof virtualFilesTable.$inferInsert> = { updatedAt: new Date() };
  if (content !== undefined) { updates.content = content; updates.size = content.length; }
  if (name !== undefined) updates.name = name;
  const [file] = await db.update(virtualFilesTable).set(updates).where(eq(virtualFilesTable.id, req.params.fileId)).returning();
  if (!file) { res.status(404).json({ error: "Not found" }); return; }
  res.json(serialize(file));
});

router.delete("/files/:fileId", async (req, res) => {
  await db.delete(virtualFilesTable).where(eq(virtualFilesTable.id, req.params.fileId));
  res.json({ success: true, message: "Deleted" });
});

export default router;
