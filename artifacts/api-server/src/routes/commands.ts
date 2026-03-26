import { Router, type IRouter } from "express";
import { db, commandsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

const router: IRouter = Router();

function serializeCommand(cmd: typeof commandsTable.$inferSelect) {
  return {
    ...cmd,
    createdAt: cmd.createdAt.toISOString(),
    completedAt: cmd.completedAt?.toISOString() ?? null,
  };
}

router.get("/commands", async (_req, res) => {
  const commands = await db.select().from(commandsTable)
    .orderBy(desc(commandsTable.createdAt))
    .limit(100);
  res.json(commands.map(serializeCommand));
});

router.post("/commands", async (req, res) => {
  const { agentId, type, payload } = req.body;
  if (!type || !payload) {
    res.status(400).json({ error: "type and payload are required" });
    return;
  }

  const id = randomUUID();
  const [cmd] = await db.insert(commandsTable).values({
    id,
    agentId: agentId ?? null,
    type,
    payload,
    status: "executing",
  }).returning();

  // Simulate command execution
  let result: Record<string, unknown> = { executed: true };
  let success = true;

  try {
    if (type === "terminal") {
      const command = (payload as { command?: string }).command ?? "";
      result = { output: simulateTerminal(command), exitCode: 0 };
    } else if (type === "screenshot") {
      result = { message: "Screenshot captured via browser client", timestamp: new Date().toISOString() };
    } else if (type === "open_app") {
      result = { app: (payload as { app?: string }).app, opened: true };
    } else {
      result = { action: type, executed: true, timestamp: new Date().toISOString() };
    }
  } catch {
    success = false;
    result = { error: "Execution failed" };
  }

  const [updated] = await db.update(commandsTable)
    .set({ status: success ? "completed" : "failed", completedAt: new Date(), result })
    .where(eq(commandsTable.id, id))
    .returning();

  res.json({
    commandId: id,
    success,
    result: updated.result,
    error: success ? undefined : "Execution failed",
  });
});

function simulateTerminal(command: string): string {
  const cmd = command.trim().toLowerCase();
  const parts = cmd.split(" ");
  const base = parts[0];

  const responses: Record<string, string> = {
    pwd: "/home/user",
    whoami: "agent-user",
    date: new Date().toString(),
    uname: "AgentOS 1.0.0 (Portable AI Computer)",
    uptime: `up ${Math.floor(Math.random() * 24)} hours, ${Math.floor(Math.random() * 60)} minutes`,
    hostname: "agent-os",
    echo: parts.slice(1).join(" "),
    clear: "\x1b[2J\x1b[H",
  };

  if (base === "ls") return "applications/  documents/  downloads/  workspace/  screenshots/  logs/";
  if (base === "ps") return "PID   NAME\n1     agent-daemon\n2     desktop-manager\n3     api-server\n4     ws-broker";
  if (base === "help") return "Available: ls, pwd, whoami, date, uname, hostname, uptime, echo, ps, clear, help";
  if (base === "cat") return `[Contents of ${parts[1] ?? "file"}]`;

  return responses[base] ?? `Command not found: ${base}. Type 'help' for available commands.`;
}

export default router;
