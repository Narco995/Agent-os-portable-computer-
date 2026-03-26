import { Router, type IRouter } from "express";
import { db, agentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const router: IRouter = Router();

router.get("/agents", async (_req, res) => {
  const agents = await db.select().from(agentsTable).orderBy(agentsTable.connectedAt);
  res.json(agents.map(a => ({
    ...a,
    connectedAt: a.connectedAt.toISOString(),
    lastSeen: a.lastSeen.toISOString(),
  })));
});

router.post("/agents", async (req, res) => {
  const { name, endpoint, capabilities } = req.body;
  if (!name || !capabilities) {
    res.status(400).json({ error: "name and capabilities are required" });
    return;
  }
  const id = randomUUID();
  const [agent] = await db.insert(agentsTable).values({
    id,
    name,
    endpoint: endpoint ?? null,
    capabilities,
    status: "active",
  }).returning();
  res.status(201).json({
    ...agent,
    connectedAt: agent.connectedAt.toISOString(),
    lastSeen: agent.lastSeen.toISOString(),
  });
});

router.delete("/agents/:agentId", async (req, res) => {
  const { agentId } = req.params;
  await db.delete(agentsTable).where(eq(agentsTable.id, agentId));
  res.json({ success: true, message: "Agent unregistered" });
});

export default router;
