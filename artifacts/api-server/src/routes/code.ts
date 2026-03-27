import { Router, type IRouter } from "express";
import { exec } from "child_process";
import { promisify } from "util";
import { logger } from "../lib/logger";

const execAsync = promisify(exec);
const router: IRouter = Router();

// ── JavaScript sandbox ─────────────────────────────────────────────────────────
function runJavaScript(code: string): { stdout: string; stderr: string; exitCode: number } {
  const logs: string[] = [];
  const errors: string[] = [];

  const sandboxConsole = {
    log:   (...a: unknown[]) => logs.push(a.map(x => typeof x === "object" ? JSON.stringify(x, null, 2) : String(x)).join(" ")),
    error: (...a: unknown[]) => errors.push(a.map(x => String(x)).join(" ")),
    warn:  (...a: unknown[]) => logs.push("[WARN] " + a.map(x => String(x)).join(" ")),
    info:  (...a: unknown[]) => logs.push("[INFO] " + a.map(x => String(x)).join(" ")),
    table: (...a: unknown[]) => logs.push(JSON.stringify(a, null, 2)),
    dir:   (...a: unknown[]) => logs.push(JSON.stringify(a, null, 2)),
    time:  () => {},
    timeEnd: () => {},
    group: () => {},
    groupEnd: () => {},
    assert: (cond: boolean, ...a: unknown[]) => { if (!cond) errors.push("Assertion failed: " + a.map(String).join(" ")); },
  };

  // Provide useful globals inside the sandbox
  const sandboxDate = Date;
  const sandboxMath = Math;
  const sandboxJSON = JSON;

  try {
    const fn = new Function(
      "console", "Date", "Math", "JSON",
      `"use strict";\n${code}`,
    );
    fn(sandboxConsole, sandboxDate, sandboxMath, sandboxJSON);
    return { stdout: logs.join("\n"), stderr: errors.join("\n"), exitCode: errors.length ? 1 : 0 };
  } catch (err: unknown) {
    return { stdout: logs.join("\n"), stderr: err instanceof Error ? err.message : String(err), exitCode: 1 };
  }
}

// ── Real Bash via child_process ────────────────────────────────────────────────
async function runBash(code: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  try {
    const { stdout, stderr } = await execAsync(code, {
      timeout: 10_000,
      cwd: "/tmp",
      env: {
        PATH: process.env.PATH,
        HOME: "/tmp",
        USER: "agent",
        TERM: "xterm-256color",
        LANG: "en_US.UTF-8",
      },
      maxBuffer: 1024 * 1024, // 1MB
    });
    return { stdout: stdout || "", stderr: stderr || "", exitCode: 0 };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; code?: number; message?: string };
    return { stdout: e.stdout ?? "", stderr: e.stderr ?? e.message ?? "Execution error", exitCode: e.code ?? 1 };
  }
}

// ── Python via child_process ────────────────────────────────────────────────────
async function runPython(code: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  // Try python3 first, fallback to python
  for (const bin of ["python3", "python"]) {
    try {
      const escaped = code.replace(/'/g, "'\"'\"'");
      const { stdout, stderr } = await execAsync(`printf '%s' '${escaped}' | ${bin}`, {
        timeout: 10_000,
        cwd: "/tmp",
        maxBuffer: 1024 * 1024,
      });
      return { stdout: stdout || "", stderr: stderr || "", exitCode: 0 };
    } catch (err: unknown) {
      const e = err as { stdout?: string; stderr?: string; code?: number; message?: string };
      if (!e.message?.includes("not found") && !e.message?.includes("No such file")) {
        return { stdout: e.stdout ?? "", stderr: e.stderr ?? e.message ?? "Execution error", exitCode: e.code ?? 1 };
      }
    }
  }
  return {
    stdout: "",
    stderr: "Python not available in this environment. Use bash or JavaScript.",
    exitCode: 127,
  };
}

// ── TypeScript (transpile → JS) ────────────────────────────────────────────────
function runTypeScript(code: string): { stdout: string; stderr: string; exitCode: number } {
  // Strip type annotations with basic regex for demos, then run as JS
  const jsCode = code
    .replace(/:\s*(string|number|boolean|any|unknown|never|void|null|undefined|object)(\[\])?/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/^(export\s+)?(interface|type)\s+\w+[^{]*\{[^}]*\}/gm, "")
    .replace(/^export\s+/gm, "");
  return runJavaScript(`// TypeScript → JavaScript\n${jsCode}`);
}

router.post("/code/run", async (req, res) => {
  const { language, code } = req.body;
  if (!language || !code) {
    res.status(400).json({ error: "language and code are required" });
    return;
  }

  const t0 = Date.now();
  let result: { stdout: string; stderr: string; exitCode: number };

  try {
    switch (language) {
      case "javascript": result = runJavaScript(code);          break;
      case "typescript": result = runTypeScript(code);          break;
      case "bash":       result = await runBash(code);          break;
      case "python":     result = await runPython(code);        break;
      default:           result = { stdout: "", stderr: `Unsupported language: ${language}`, exitCode: 1 };
    }
  } catch (err) {
    logger.error({ err, language }, "Code execution error");
    result = { stdout: "", stderr: "Internal execution error", exitCode: 1 };
  }

  res.json({ ...result, executionTime: Date.now() - t0, success: result.exitCode === 0 });
});

export default router;
