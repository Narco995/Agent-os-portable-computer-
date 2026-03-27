import { Router, type IRouter } from "express";
import { db, agentsTable, commandsTable } from "@workspace/db";
import { count } from "drizzle-orm";
import os from "os";

const router: IRouter = Router();

const APPS = [
  { id: "terminal",    name: "Terminal",       icon: "terminal",       description: "AI-powered command-line interface",     isOpen: false },
  { id: "browser",     name: "Browser",        icon: "globe",          description: "Virtual web browser",                   isOpen: false },
  { id: "editor",      name: "Code Editor",    icon: "file-text",      description: "Code and script editor with execution",  isOpen: false },
  { id: "aichat",      name: "AI Chat",        icon: "message-square", description: "GPT streaming AI assistant",             isOpen: false },
  { id: "monitor",     name: "Sys Monitor",    icon: "activity",       description: "Real-time hardware & process monitor",   isOpen: false },
  { id: "router",      name: "Agent Router",   icon: "cpu",            description: "Multi-agent orchestration dashboard",    isOpen: false },
  { id: "filemanager", name: "File Manager",   icon: "folder",         description: "Virtual filesystem explorer & editor",   isOpen: false },
  { id: "codeide",     name: "Code IDE",       icon: "code",           description: "Multi-language sandbox executor",        isOpen: false },
  { id: "memory",      name: "Memory Vault",   icon: "brain",          description: "Agent episodic/semantic memory store",   isOpen: false },
  { id: "settings",    name: "Settings",       icon: "settings",       description: "System configuration & API reference",  isOpen: false },
];

const startTime = Date.now();

// CPU usage sampler (two-sample delta for real percentage)
let prevSample = os.cpus().map(c => ({
  idle: c.times.idle,
  total: Object.values(c.times).reduce((a, b) => a + b, 0),
}));

function getCpuPercent(): number {
  const curr = os.cpus().map(c => ({
    idle: c.times.idle,
    total: Object.values(c.times).reduce((a, b) => a + b, 0),
  }));
  const percents = curr.map((c, i) => {
    const dTotal = c.total - (prevSample[i]?.total ?? c.total);
    const dIdle  = c.idle  - (prevSample[i]?.idle  ?? c.idle);
    return dTotal === 0 ? 0 : ((dTotal - dIdle) / dTotal) * 100;
  });
  prevSample = curr;
  return parseFloat((percents.reduce((a, b) => a + b, 0) / percents.length).toFixed(1));
}

router.get("/system/state", async (_req, res) => {
  const [agentRow] = await db.select({ count: count() }).from(agentsTable);
  const [cmdRow]   = await db.select({ count: count() }).from(commandsTable);

  const totalMem = os.totalmem();
  const freeMem  = os.freemem();
  const usedMem  = totalMem - freeMem;
  const cpus     = os.cpus();
  const load     = os.loadavg();
  const mu       = process.memoryUsage();

  // Gather non-internal IPv4 addresses
  const networkInfo = Object.entries(os.networkInterfaces())
    .flatMap(([iface, addrs]) =>
      (addrs ?? [])
        .filter(a => !a.internal && a.family === "IPv4")
        .map(a => ({ interface: iface, address: a.address, mac: a.mac })),
    );

  res.json({
    cpu:              getCpuPercent(),
    memory:           parseFloat(((usedMem / totalMem) * 100).toFixed(1)),
    totalMemoryGB:    parseFloat((totalMem / 1073741824).toFixed(2)),
    freeMemoryGB:     parseFloat((freeMem  / 1073741824).toFixed(2)),
    usedMemoryGB:     parseFloat((usedMem  / 1073741824).toFixed(2)),
    uptime:           Math.floor(os.uptime()),
    processUptime:    Math.floor((Date.now() - startTime) / 1000),
    platform:         os.platform(),
    arch:             os.arch(),
    hostname:         os.hostname(),
    nodeVersion:      process.version,
    cpuModel:         cpus[0]?.model ?? "Unknown",
    cpuCores:         cpus.length,
    cpuSpeedMHz:      cpus[0]?.speed ?? 0,
    loadAverage:      load.map(l => parseFloat(l.toFixed(2))),
    connectedAgents:  Number(agentRow?.count ?? 0),
    totalCommands:    Number(cmdRow?.count  ?? 0),
    networkInterfaces: networkInfo,
    process: {
      pid:       process.pid,
      rssKB:     Math.round(mu.rss       / 1024),
      heapUsedKB:Math.round(mu.heapUsed  / 1024),
      heapTotalKB:Math.round(mu.heapTotal / 1024),
      externalKB: Math.round((mu.external ?? 0) / 1024),
    },
  });
});

router.get("/system/apps",       (_req, res) => res.json(APPS));
router.get("/system/screenshot", (_req, res) =>
  res.json({ dataUrl: null, timestamp: new Date().toISOString(), width: 1280, height: 720 }),
);

export default router;
