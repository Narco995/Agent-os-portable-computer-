import { Router, type IRouter } from "express";
import { db, agentsTable, commandsTable } from "@workspace/db";
import { count } from "drizzle-orm";

const router: IRouter = Router();

const APPS = [
  { id: "terminal", name: "Terminal", icon: "terminal", description: "Command line interface", isOpen: false },
  { id: "filemanager", name: "File Manager", icon: "folder", description: "Browse and manage files", isOpen: false },
  { id: "browser", name: "Browser", icon: "globe", description: "Web browser", isOpen: false },
  { id: "editor", name: "Text Editor", icon: "file-text", description: "Code and text editor", isOpen: false },
  { id: "aichat", name: "AI Chat", icon: "message-square", description: "Chat interface for agents", isOpen: false },
  { id: "monitor", name: "Hardware Monitor", icon: "activity", description: "System performance monitor", isOpen: false },
  { id: "router", name: "AI Router", icon: "cpu", description: "Agent management panel", isOpen: false },
  { id: "settings", name: "Settings", icon: "settings", description: "System configuration", isOpen: false },
];

const startTime = Date.now();

router.get("/system/state", async (_req, res) => {
  const [agentCount] = await db.select({ count: count() }).from(agentsTable);
  const [cmdCount] = await db.select({ count: count() }).from(commandsTable);

  res.json({
    runningApps: [],
    cpu: Math.random() * 40 + 10,
    memory: Math.random() * 30 + 40,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    connectedAgents: Number(agentCount?.count ?? 0),
    totalCommands: Number(cmdCount?.count ?? 0),
  });
});

router.get("/system/apps", (_req, res) => {
  res.json(APPS);
});

router.get("/system/screenshot", (_req, res) => {
  res.json({
    dataUrl: null,
    timestamp: new Date().toISOString(),
    width: 1280,
    height: 720,
  });
});

export default router;
