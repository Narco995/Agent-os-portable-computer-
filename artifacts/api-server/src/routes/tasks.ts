import { Router, type IRouter } from "express";
import { db, tasksTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

const router: IRouter = Router();

function serializeTask(task: typeof tasksTable.$inferSelect) {
  return {
    ...task,
    createdAt: task.createdAt.toISOString(),
    completedAt: task.completedAt?.toISOString() ?? null,
  };
}

router.get("/tasks", async (_req, res) => {
  const tasks = await db.select().from(tasksTable)
    .orderBy(desc(tasksTable.createdAt))
    .limit(50);
  res.json(tasks.map(serializeTask));
});

router.post("/tasks", async (req, res) => {
  const { agentId, name, description, steps } = req.body;
  if (!name || !steps || !Array.isArray(steps)) {
    res.status(400).json({ error: "name and steps are required" });
    return;
  }

  const id = randomUUID();
  const formattedSteps = steps.map((s: { description: string; commandType: string }, i: number) => ({
    id: `step-${i + 1}`,
    description: s.description,
    status: "pending",
    commandType: s.commandType,
  }));

  const [task] = await db.insert(tasksTable).values({
    id,
    agentId: agentId ?? null,
    name,
    description: description ?? null,
    status: "running",
    steps: formattedSteps,
    progress: 0,
  }).returning();

  // Simulate async task execution
  simulateTaskExecution(id, formattedSteps.length).catch(() => {});

  res.status(201).json(serializeTask(task));
});

router.get("/tasks/:taskId", async (req, res) => {
  const { taskId } = req.params;
  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, taskId));
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.json(serializeTask(task));
});

async function simulateTaskExecution(taskId: string, totalSteps: number) {
  for (let i = 0; i < totalSteps; i++) {
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
    const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, taskId));
    if (!task) break;
    const steps = task.steps.map((s, idx) => idx === i ? { ...s, status: "completed", result: "Success" } : s);
    const progress = ((i + 1) / totalSteps) * 100;
    const isLast = i === totalSteps - 1;
    await db.update(tasksTable).set({
      steps,
      progress,
      status: isLast ? "completed" : "running",
      completedAt: isLast ? new Date() : null,
    }).where(eq(tasksTable.id, taskId));
  }
}

export default router;
