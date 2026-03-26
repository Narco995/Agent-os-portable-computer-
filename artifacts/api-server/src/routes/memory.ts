import { Router, type IRouter } from "express";
import { db, memoriesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

const router: IRouter = Router();

function serialize(m: typeof memoriesTable.$inferSelect) {
  return {
    ...m,
    createdAt: m.createdAt.toISOString(),
  };
}

router.get("/memory", async (req, res) => {
  const { agentId, type } = req.query as { agentId?: string; type?: string };
  let query = db.select().from(memoriesTable).orderBy(desc(memoriesTable.createdAt)).$dynamic();

  if (agentId) query = query.where(eq(memoriesTable.agentId, agentId));

  const memories = await query;
  const filtered = type ? memories.filter(m => m.type === type) : memories;
  res.json(filtered.map(serialize));
});

router.post("/memory", async (req, res) => {
  const { agentId, type = "episodic", content, tags = [], importance = 0.5 } = req.body;
  if (!content) { res.status(400).json({ error: "content is required" }); return; }
  const [memory] = await db.insert(memoriesTable).values({
    id: randomUUID(),
    agentId: agentId ?? null,
    type,
    content,
    tags,
    importance,
  }).returning();
  res.status(201).json(serialize(memory));
});

router.delete("/memory/:memoryId", async (req, res) => {
  await db.delete(memoriesTable).where(eq(memoriesTable.id, req.params.memoryId));
  res.json({ success: true, message: "Memory deleted" });
});

export default router;
