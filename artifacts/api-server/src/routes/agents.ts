import { Router, type IRouter } from "express";
import { db, agentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const router: IRouter = Router();

// Broadcast helper — imported lazily to avoid circular dep with index.ts
async function broadcast(event: Record<string, unknown>) {
  try {
    const { broadcast: bc } = await import("../index.js");
    bc(event);
  } catch { /* WS not yet ready */ }
}

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

  await broadcast({
    type: "agent:registered",
    message: `Agent "${name}" connected`,
    agentId: id,
    capabilities,
  });

  res.status(201).json({
    ...agent,
    connectedAt: agent.connectedAt.toISOString(),
    lastSeen: agent.lastSeen.toISOString(),
  });
});

router.delete("/agents/:agentId", async (req, res) => {
  const { agentId } = req.params;
  const [removed] = await db.delete(agentsTable).where(eq(agentsTable.id, agentId)).returning();

  await broadcast({
    type: "agent:unregistered",
    message: `Agent "${removed?.name ?? agentId}" disconnected`,
    agentId,
  });

  res.json({ success: true, message: "Agent unregistered" });
});

export default router;
