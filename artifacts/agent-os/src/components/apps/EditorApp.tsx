import React, { useState } from 'react';
import { Save, Play, FileCode, CheckCircle } from 'lucide-react';

const BASE = import.meta.env.BASE_URL;
const API = `${BASE}api`;

const INITIAL_CODE = `// Agent OS — Script Editor
// Press ▶ Run to execute this in the Code IDE sandbox

function initAgent() {
  console.log("Connecting to Agent OS core...");
  const status = checkSystems();
  return status === "OK";
}

function checkSystems() {
  const checks = ['filesystem', 'memory', 'network', 'AI'];
  checks.forEach(s => console.log(\`  [\u2713] \${s} online\`));
  return "OK";
}

initAgent();
console.log("Agent OS ready.");`;

export function EditorApp() {
  const [code, setCode] = useState(INITIAL_CODE);
  const [saved, setSaved] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [filename, setFilename] = useState('agent_script.js');

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleRun() {
    setRunning(true);
    setOutput(null);
    try {
      const res = await fetch(`${API}/code/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: 'javascript', code }),
      });
      const data = await res.json();
      setOutput(data.stdout || data.stderr || '(no output)');
    } catch {
      setOutput('Error: could not execute code');
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e]">
      {/* Toolbar */}
      <div className="bg-[#2d2d2d] flex items-center px-4 py-2 border-b border-black/50 gap-3 shrink-0">
        <div className="flex items-center gap-2 text-gray-300">
          <FileCode size={15} className="text-cyan-400" />
          <input
            value={filename}
            onChange={e => setFilename(e.target.value)}
            className="text-sm font-mono bg-transparent text-gray-300 border-b border-transparent hover:border-white/20 focus:border-cyan-500 outline-none w-40 transition-colors"
          />
        </div>
        <div className="flex-1" />
        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#3d3d3d] hover:bg-[#4d4d4d] text-gray-200 text-xs transition-colors"
        >
          {saved ? <CheckCircle size={13} className="text-green-400" /> : <Save size={13} />}
          {saved ? 'Saved' : 'Save'}
        </button>
        <button
          onClick={handleRun}
          disabled={running}
          className="flex items-center gap-1.5 px-3 py-1 rounded bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/30 text-xs transition-colors disabled:opacity-50"
        >
          <Play size={13} className={running ? 'animate-pulse' : ''} />
          {running ? 'Running...' : 'Run'}
        </button>
      </div>

      {/* Editor */}
      <div className="flex-1 relative font-mono text-sm overflow-hidden flex">
        {/* Line numbers */}
        <div className="w-10 bg-[#1a1a1a] text-gray-600 text-right text-xs py-4 pr-2 select-none leading-relaxed shrink-0 overflow-hidden">
          {code.split('\n').map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <textarea
          value={code}
          onChange={e => setCode(e.target.value)}
          className="flex-1 bg-transparent text-gray-300 py-4 px-3 resize-none focus:outline-none leading-relaxed"
          spellCheck={false}
          onKeyDown={e => {
            if (e.key === 'Tab') {
              e.preventDefault();
              const s = e.currentTarget.selectionStart;
              const end = e.currentTarget.selectionEnd;
              const next = code.substring(0, s) + '  ' + code.substring(end);
              setCode(next);
              setTimeout(() => { e.currentTarget.selectionStart = e.currentTarget.selectionEnd = s + 2; }, 0);
            }
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleRun();
          }}
        />
      </div>

      {/* Output Panel */}
      {output !== null && (
        <div className="shrink-0 border-t border-black/50 bg-[#111] max-h-32 overflow-y-auto">
          <div className="px-3 py-1 text-[10px] text-gray-500 uppercase tracking-wider border-b border-white/5 flex items-center justify-between">
            <span>Output</span>
            <button onClick={() => setOutput(null)} className="text-gray-600 hover:text-gray-400">✕</button>
          </div>
          <pre className="p-3 text-xs text-green-300 font-mono whitespace-pre-wrap">{output}</pre>
        </div>
      )}
    </div>
  );
}
