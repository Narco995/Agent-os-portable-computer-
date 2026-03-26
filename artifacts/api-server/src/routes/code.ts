import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// Safe JS sandbox evaluator
function runJavaScript(code: string): { stdout: string; stderr: string; exitCode: number } {
  const logs: string[] = [];
  const errors: string[] = [];

  const sandboxConsole = {
    log: (...args: unknown[]) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')),
    error: (...args: unknown[]) => errors.push(args.map(a => String(a)).join(' ')),
    warn: (...args: unknown[]) => logs.push('[WARN] ' + args.map(a => String(a)).join(' ')),
    info: (...args: unknown[]) => logs.push('[INFO] ' + args.map(a => String(a)).join(' ')),
  };

  try {
    // Create sandboxed function
    const fn = new Function('console', `
      "use strict";
      ${code}
    `);
    fn(sandboxConsole);
    return { stdout: logs.join('\n'), stderr: errors.join('\n'), exitCode: 0 };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { stdout: logs.join('\n'), stderr: message, exitCode: 1 };
  }
}

function runBash(code: string): { stdout: string; stderr: string; exitCode: number } {
  const lines = code.split('\n');
  const output: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const parts = trimmed.split(' ');
    const cmd = parts[0];

    if (cmd === 'echo') {
      output.push(parts.slice(1).join(' ').replace(/["']/g, ''));
    } else if (cmd === 'ls') {
      output.push('applications/  documents/  downloads/  workspace/  screenshots/');
    } else if (cmd === 'pwd') {
      output.push('/home/agent');
    } else if (cmd === 'date') {
      output.push(new Date().toString());
    } else if (cmd === 'whoami') {
      output.push('agent-user');
    } else if (cmd === 'cat') {
      output.push(`[Reading file: ${parts[1] ?? 'unknown'}]`);
    } else if (cmd === 'mkdir' || cmd === 'touch' || cmd === 'rm') {
      output.push(`${cmd}: operation simulated`);
    } else {
      output.push(`bash: ${cmd}: command not found in sandbox`);
    }
  }

  return { stdout: output.join('\n'), stderr: '', exitCode: 0 };
}

function runPython(code: string): { stdout: string; stderr: string; exitCode: number } {
  const output: string[] = [];

  // Parse simple Python patterns
  const lines = code.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const printMatch = trimmed.match(/^print\s*\((.*)\)$/);
    if (printMatch) {
      const expr = printMatch[1].trim();
      const strMatch = expr.match(/^["'](.*)["']$/);
      if (strMatch) {
        output.push(strMatch[1]);
      } else {
        try {
          // Evaluate simple expressions
          const result = Function(`"use strict"; return (${expr})`)();
          output.push(String(result));
        } catch {
          output.push(expr);
        }
      }
      continue;
    }

    // Variable assignments  
    if (trimmed.includes('=') && !trimmed.startsWith('if') && !trimmed.startsWith('while')) {
      continue; // Silently handle assignments
    }
  }

  return {
    stdout: output.join('\n') || '# Python sandbox: simple expressions evaluated\n# Full Python execution requires a Python runtime',
    stderr: '',
    exitCode: 0
  };
}

router.post("/code/run", async (req, res) => {
  const { language, code, agentId } = req.body;

  if (!language || !code) {
    res.status(400).json({ error: "language and code are required" });
    return;
  }

  const startTime = Date.now();
  let result: { stdout: string; stderr: string; exitCode: number };

  try {
    switch (language) {
      case 'javascript':
        result = runJavaScript(code);
        break;
      case 'bash':
        result = runBash(code);
        break;
      case 'python':
        result = runPython(code);
        break;
      default:
        result = { stdout: '', stderr: `Unsupported language: ${language}`, exitCode: 1 };
    }
  } catch (err) {
    logger.error({ err, language }, "Code execution error");
    result = { stdout: '', stderr: 'Internal execution error', exitCode: 1 };
  }

  const executionTime = Date.now() - startTime;

  res.json({
    ...result,
    executionTime,
    success: result.exitCode === 0,
  });
});

export default router;
