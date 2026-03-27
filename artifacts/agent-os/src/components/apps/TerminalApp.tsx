import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Maximize2, Wifi } from 'lucide-react';

const BASE = import.meta.env.BASE_URL;
const API  = `${BASE}api`;
const HOSTNAME = 'agent-os';
const USER = 'agent';

type LogType = 'input' | 'output' | 'error' | 'warning' | 'info' | 'ai' | 'system' | 'success';

interface LogLine {
  id: number;
  type: LogType;
  text: string;
  ts?: string;
}

const BANNER = [
  '╔═══════════════════════════════════════════════════════════╗',
  '║         AGENT OS — AI PORTABLE COMPUTER v2.0.0           ║',
  '║     Neural-Augmented Terminal  ·  REST + WebSocket API   ║',
  '╚═══════════════════════════════════════════════════════════╝',
  '',
  '  Type \x1bhelp\x1b for commands   ·   \x1bai <query>\x1b to talk to GPT',
  '',
];

const BUILTIN_HELP = `
BUILT-IN COMMANDS
─────────────────
  help             Show this help
  clear / cls      Clear terminal
  history          Show command history
  version / ver    Show OS version
  banner           Show welcome banner
  whoami           Current user
  hostname         Hostname
  date             Current date/time
  env              Show environment vars
  uptime           System uptime
  sysinfo          Full system information
  agents           List registered agents
  memory           List stored memories
  files            List virtual files

AI COMMANDS
───────────
  ai <query>       Ask the AI assistant (streaming GPT response)
  ai --clear       Reset AI conversation context

EXECUTION (runs via sandbox API)
──────────────────────────────────
  run <lang> <code>   Run code inline (js/py/bash)
  js <expression>     Evaluate JavaScript expression
  bash <command>      Execute bash command

API SHORTCUTS
─────────────
  ping             Check API health
  ws               Show WebSocket status
`.trim();

let lineId = 1;
const mkLine = (type: LogType, text: string): LogLine => ({
  id: lineId++,
  type,
  text,
  ts: new Date().toLocaleTimeString(),
});

const initial: LogLine[] = BANNER.map(t => mkLine('info', t));
initial.push(mkLine('system', `Session started · ${new Date().toLocaleString()}`));

export function TerminalApp() {
  const [lines, setLines] = useState<LogLine[]>(initial);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [histIndex, setHistIndex] = useState(-1);
  const [aiConvId, setAiConvId] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [cwd, setCwd] = useState('~');
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [lines]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const addLine  = useCallback((type: LogType, text: string) => setLines(p => [...p, mkLine(type, text)]), []);
  const addLines = useCallback((type: LogType, texts: string[]) => setLines(p => [...p, ...texts.map(t => mkLine(type, t))]), []);

  async function getOrCreateAiConv(): Promise<number> {
    if (aiConvId !== null) return aiConvId;
    const res = await fetch(`${API}/openai/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Terminal AI Session' }),
    });
    const conv = await res.json();
    setAiConvId(conv.id);
    return conv.id;
  }

  async function runAICommand(query: string) {
    if (query === '--clear') {
      setAiConvId(null);
      addLine('success', 'AI conversation context cleared.');
      return;
    }

    setIsRunning(true);
    addLine('info', '⟳ Querying Agent OS AI...');

    try {
      const convId = await getOrCreateAiConv();
      abortRef.current = new AbortController();

      const res = await fetch(`${API}/openai/conversations/${convId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: query }),
        signal: abortRef.current.signal,
      });

      if (!res.body) throw new Error('No response body');

      // Start a streaming line
      let streamLine = mkLine('ai', '');
      setLines(p => [...p, streamLine]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const rawLine of chunk.split('\n')) {
          if (!rawLine.startsWith('data: ')) continue;
          try {
            const parsed = JSON.parse(rawLine.slice(6));
            if (parsed.content) {
              accumulated += parsed.content;
              // Update the streaming line in-place
              setLines(p => p.map(l => l.id === streamLine.id ? { ...l, text: accumulated } : l));
            }
          } catch { /* ignore */ }
        }
      }
    } catch (err: unknown) {
      if ((err as Error)?.name !== 'AbortError') {
        addLine('error', `AI Error: ${(err as Error).message ?? 'Unknown error'}`);
      }
    } finally {
      setIsRunning(false);
    }
  }

  async function runCode(language: string, code: string) {
    setIsRunning(true);
    try {
      const res = await fetch(`${API}/code/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language, code }),
      });
      const data = await res.json();
      if (data.stdout) addLines('output', data.stdout.split('\n').filter(Boolean));
      if (data.stderr) addLines('error', data.stderr.split('\n').filter(Boolean));
      addLine('system', `Exit ${data.exitCode} · ${data.executionTime}ms`);
    } catch {
      addLine('error', 'Execution failed — API unreachable');
    } finally {
      setIsRunning(false);
    }
  }

  async function handleCommand(raw: string) {
    const cmd = raw.trim();
    if (!cmd) return;

    // History
    setHistory(h => [...h.filter(x => x !== cmd), cmd]);
    setHistIndex(-1);
    addLine('input', `${USER}@${HOSTNAME}:${cwd}$ ${cmd}`);

    const [verb, ...rest] = cmd.split(/\s+/);
    const args = rest.join(' ');

    switch (verb.toLowerCase()) {
      case 'clear': case 'cls':
        setLines([]);
        return;

      case 'help':
        addLines('info', BUILTIN_HELP.split('\n'));
        return;

      case 'banner':
        addLines('info', BANNER);
        return;

      case 'history':
        history.forEach((h, i) => addLine('output', `  ${String(i + 1).padStart(3)} ${h}`));
        return;

      case 'version': case 'ver':
        addLine('success', 'Agent OS v2.0.0 · Neural Architecture · Build 2026.03');
        return;

      case 'whoami':
        addLine('output', USER);
        return;

      case 'hostname':
        addLine('output', HOSTNAME);
        return;

      case 'date':
        addLine('output', new Date().toString());
        return;

      case 'env':
        addLines('output', ['NODE_ENV=production', 'AGENT_OS=1', 'TERM=xterm-256color', 'USER=agent', `HOME=/home/${USER}`]);
        return;

      case 'uptime': {
        setIsRunning(true);
        try {
          const r = await fetch(`${API}/system/state`);
          const d = await r.json();
          const s = d.uptime;
          addLine('output', `up ${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m ${s%60}s`);
        } catch { addLine('error', 'Cannot reach system API'); }
        setIsRunning(false);
        return;
      }

      case 'sysinfo': {
        setIsRunning(true);
        try {
          const r = await fetch(`${API}/system/state`);
          const d = await r.json();
          addLines('output', [
            `  OS:        Agent OS v2.0.0`,
            `  Hostname:  ${d.hostname}`,
            `  Platform:  ${d.platform} (${d.arch})`,
            `  Node.js:   ${d.nodeVersion}`,
            `  CPU:       ${d.cpuModel} × ${d.cpuCores} cores @ ${d.cpuSpeedMHz}MHz`,
            `  CPU Load:  ${d.cpu}%  ·  Load avg: ${d.loadAverage?.join(' ')}`,
            `  Memory:    ${d.usedMemoryGB}GB / ${d.totalMemoryGB}GB (${d.memory}%)`,
            `  Uptime:    ${Math.floor(d.uptime/3600)}h ${Math.floor((d.uptime%3600)/60)}m`,
            `  Process:   PID ${d.process?.pid}  · Heap ${d.process?.heapUsedKB}KB`,
            `  Agents:    ${d.connectedAgents} connected`,
            `  Commands:  ${d.totalCommands} total`,
          ]);
        } catch { addLine('error', 'Cannot reach system API'); }
        setIsRunning(false);
        return;
      }

      case 'agents': {
        setIsRunning(true);
        try {
          const r = await fetch(`${API}/agents`);
          const agents = await r.json();
          if (agents.length === 0) { addLine('output', 'No agents registered.'); }
          else {
            addLine('info', `${agents.length} agent(s) connected:`);
            agents.forEach((a: any) => addLine('output', `  ${a.id.slice(0,8)}  ${a.name.padEnd(20)} ${a.status}  [${a.capabilities.join(', ')}]`));
          }
        } catch { addLine('error', 'Cannot reach agents API'); }
        setIsRunning(false);
        return;
      }

      case 'memory': {
        setIsRunning(true);
        try {
          const r = await fetch(`${API}/memory`);
          const mems = await r.json();
          if (mems.length === 0) { addLine('output', 'Memory vault empty.'); }
          else {
            addLine('info', `${mems.length} memory record(s):`);
            mems.slice(0, 10).forEach((m: any) => addLine('output', `  [${m.type.padEnd(10)}] ${m.content.slice(0, 70)}${m.content.length > 70 ? '…' : ''}`));
            if (mems.length > 10) addLine('system', `  ... and ${mems.length - 10} more`);
          }
        } catch { addLine('error', 'Cannot reach memory API'); }
        setIsRunning(false);
        return;
      }

      case 'files': {
        setIsRunning(true);
        try {
          const r = await fetch(`${API}/files?path=/`);
          const files = await r.json();
          if (files.length === 0) { addLine('output', 'Virtual filesystem empty.'); }
          else {
            addLine('info', `Virtual filesystem (${files.length} entries):`);
            files.forEach((f: any) => addLine('output', `  ${f.type === 'directory' ? 'd' : '-'}  ${f.path.padEnd(30)} ${f.type === 'file' ? (f.size + 'B').padStart(8) : ''}`));
          }
        } catch { addLine('error', 'Cannot reach files API'); }
        setIsRunning(false);
        return;
      }

      case 'ping': {
        setIsRunning(true);
        try {
          const t = Date.now();
          await fetch(`${API}/healthz`);
          addLine('success', `API online — ${Date.now() - t}ms`);
        } catch { addLine('error', 'API unreachable'); }
        setIsRunning(false);
        return;
      }

      case 'ws':
        addLine('output', `WebSocket path: /api/ws  ·  Protocol: wss://`);
        return;

      case 'ai':
        if (!args) { addLine('warning', 'Usage: ai <your question>'); return; }
        await runAICommand(args);
        return;

      case 'js':
        if (!args) { addLine('warning', 'Usage: js <expression>'); return; }
        await runCode('javascript', `console.log(${args})`);
        return;

      case 'bash':
        if (!args) { addLine('warning', 'Usage: bash <command>'); return; }
        await runCode('bash', args);
        return;

      case 'run': {
        const [lang, ...codeParts] = rest;
        if (!lang || codeParts.length === 0) { addLine('warning', 'Usage: run <js|py|bash> <code>'); return; }
        await runCode(lang.toLowerCase() === 'py' ? 'python' : lang.toLowerCase(), codeParts.join(' '));
        return;
      }

      default:
        // Try as bash
        await runCode('bash', cmd);
        return;
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !isRunning) {
      handleCommand(input);
      setInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newIdx = Math.min(histIndex + 1, history.length - 1);
      setHistIndex(newIdx);
      setInput(history[history.length - 1 - newIdx] ?? '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newIdx = Math.max(histIndex - 1, -1);
      setHistIndex(newIdx);
      setInput(newIdx === -1 ? '' : history[history.length - 1 - newIdx] ?? '');
    } else if (e.key === 'c' && e.ctrlKey) {
      abortRef.current?.abort();
      setIsRunning(false);
      addLine('warning', '^C');
      setInput('');
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      setLines([]);
    }
  }

  function getLineStyle(type: LogType): React.CSSProperties {
    switch (type) {
      case 'input':   return { color: '#ffffff', opacity: 0.95 };
      case 'output':  return { color: 'var(--neon-green)' };
      case 'error':   return { color: 'var(--neon-pink)' };
      case 'warning': return { color: 'var(--neon-orange)' };
      case 'info':    return { color: 'rgba(0,212,255,0.75)' };
      case 'ai':      return { color: 'var(--neon-purple)', whiteSpace: 'pre-wrap' };
      case 'system':  return { color: 'rgba(255,255,255,0.28)', fontStyle: 'italic' };
      case 'success': return { color: 'var(--neon-green)', fontWeight: 600 };
      default:        return { color: '#e0e0e0' };
    }
  }

  return (
    <div
      className="h-full flex flex-col overflow-hidden cursor-text"
      style={{ background: '#050508', fontFamily: 'var(--font-mono)' }}
      onClick={() => inputRef.current?.focus()}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b bg-black/60" style={{ borderColor: 'rgba(0,212,255,0.12)' }}>
        <div className="flex items-center gap-2 text-[10px]" style={{ color: 'rgba(0,212,255,0.5)' }}>
          <span>NEURAL TERMINAL</span>
          <span style={{ opacity: 0.3 }}>·</span>
          <span>{USER}@{HOSTNAME}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {isRunning && (
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" title="Running" />
          )}
          <Wifi size={10} style={{ color: 'rgba(0,212,255,0.4)' }} />
        </div>
      </div>

      {/* Log output */}
      <div className="flex-1 overflow-y-auto p-3 space-y-0.5 text-xs leading-5">
        {lines.map(line => (
          <div key={line.id} style={{ ...getLineStyle(line.type), wordBreak: 'break-all', fontFamily: 'var(--font-mono)' }}>
            {line.type === 'ai' ? (
              <span>
                <span style={{ color: 'rgba(168,85,247,0.6)', marginRight: 4 }}>AI▸</span>
                {line.text || <span className="animate-pulse">▋</span>}
              </span>
            ) : line.text}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Input prompt */}
      <div
        className="flex items-center gap-2 px-3 py-2 border-t"
        style={{ background: '#08080e', borderColor: 'rgba(0,212,255,0.12)' }}
      >
        <span className="text-xs flex-shrink-0" style={{ color: 'var(--neon-cyan)', fontFamily: 'var(--font-mono)' }}>
          <span style={{ color: 'var(--neon-green)' }}>{USER}</span>
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>@</span>
          <span style={{ color: 'var(--neon-cyan)' }}>{HOSTNAME}</span>
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>:</span>
          <span style={{ color: 'var(--neon-purple)' }}>{cwd}</span>
          <span style={{ color: 'rgba(255,255,255,0.5)' }}>$</span>
        </span>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={isRunning}
          className="flex-1 bg-transparent outline-none border-none text-white text-xs caret-cyan-400"
          style={{ fontFamily: 'var(--font-mono)' }}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          placeholder={isRunning ? '⟳ running...' : ''}
        />
        {isRunning && (
          <div className="w-1.5 h-3 bg-cyan-400 animate-pulse rounded-sm" />
        )}
      </div>
    </div>
  );
}
