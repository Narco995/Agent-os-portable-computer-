import React, { useState, useRef } from 'react';
import { Play, RotateCcw, ChevronDown } from 'lucide-react';

const BASE = import.meta.env.BASE_URL;
const API = `${BASE}api`;

type Language = 'javascript' | 'python' | 'bash';

interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
  success: boolean;
}

const STARTER: Record<Language, string> = {
  javascript: `// Agent OS Code IDE — JavaScript
const greet = (name) => \`Hello from Agent OS, \${name}!\`;
console.log(greet('World'));

// Try some calculations
const fib = (n) => n <= 1 ? n : fib(n-1) + fib(n-2);
for (let i = 0; i < 10; i++) {
  console.log(\`fib(\${i}) = \${fib(i)}\`);
}
`,
  python: `# Agent OS Code IDE — Python
def greet(name):
    return f"Hello from Agent OS, {name}!"

print(greet("World"))

# Fibonacci
def fib(n):
    return n if n <= 1 else fib(n-1) + fib(n-2)

for i in range(10):
    print(f"fib({i}) = {fib(i)}")
`,
  bash: `#!/bin/bash
# Agent OS Code IDE — Bash

echo "=== Agent OS System Info ==="
echo "User: $(whoami)"
echo "Directory: $(pwd)"
echo ""
echo "=== Files ==="
ls
echo ""
echo "=== Date ==="
date
`,
};

const LANG_COLORS: Record<Language, string> = {
  javascript: 'text-yellow-400',
  python: 'text-blue-400',
  bash: 'text-green-400',
};

export function CodeIDEApp() {
  const [language, setLanguage] = useState<Language>('javascript');
  const [code, setCode] = useState(STARTER.javascript);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [running, setRunning] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);

  function changeLanguage(lang: Language) {
    setLanguage(lang);
    setCode(STARTER[lang]);
    setResult(null);
    setShowLangMenu(false);
  }

  async function runCode() {
    if (running) return;
    setRunning(true);
    setResult(null);

    try {
      const res = await fetch(`${API}/code/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language, code }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ stdout: '', stderr: 'Network error', exitCode: 1, executionTime: 0, success: false });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-black/40">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-cyan-500/20 bg-black/20">
        {/* Language Selector */}
        <div className="relative">
          <button
            onClick={() => setShowLangMenu(!showLangMenu)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs border border-white/10 rounded bg-black/30 hover:bg-white/5 transition-colors ${LANG_COLORS[language]}`}
          >
            <span className="uppercase font-mono font-semibold">{language}</span>
            <ChevronDown size={11} />
          </button>
          {showLangMenu && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-black/90 border border-cyan-500/20 rounded shadow-xl min-w-[120px]">
              {(['javascript', 'python', 'bash'] as Language[]).map(lang => (
                <button
                  key={lang}
                  onClick={() => changeLanguage(lang)}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-white/10 transition-colors ${LANG_COLORS[lang]} ${language === lang ? 'bg-white/5' : ''}`}
                >
                  {lang.charAt(0).toUpperCase() + lang.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1" />

        <button
          onClick={() => setCode(STARTER[language])}
          title="Reset code"
          className="p-1.5 rounded hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
        >
          <RotateCcw size={13} />
        </button>

        <button
          onClick={runCode}
          disabled={running}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 border border-green-500/30 rounded text-green-400 text-xs hover:bg-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Play size={13} className={running ? 'animate-pulse' : ''} />
          {running ? 'Running...' : 'Run'}
        </button>
      </div>

      {/* Editor + Output split */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Code Editor */}
        <div className="flex-1 relative overflow-hidden">
          <div className="absolute inset-0 flex">
            {/* Line numbers */}
            <div className="w-10 bg-black/20 border-r border-white/5 text-right text-white/20 text-xs font-mono py-3 pr-2 overflow-hidden select-none leading-5">
              {code.split('\n').map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            <textarea
              value={code}
              onChange={e => setCode(e.target.value)}
              className="flex-1 bg-transparent p-3 font-mono text-xs text-green-300 resize-none focus:outline-none leading-5 overflow-auto"
              spellCheck={false}
              style={{ tabSize: 2 }}
              onKeyDown={e => {
                if (e.key === 'Tab') {
                  e.preventDefault();
                  const start = e.currentTarget.selectionStart;
                  const end = e.currentTarget.selectionEnd;
                  const newValue = code.substring(0, start) + '  ' + code.substring(end);
                  setCode(newValue);
                  setTimeout(() => { e.currentTarget.selectionStart = e.currentTarget.selectionEnd = start + 2; }, 0);
                }
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { runCode(); }
              }}
            />
          </div>
        </div>

        {/* Output Terminal */}
        <div className="h-40 border-t border-cyan-500/20 bg-black/60 flex flex-col">
          <div className="flex items-center gap-2 px-3 py-1 border-b border-white/5 bg-black/30">
            <span className="text-xs font-mono text-white/40">OUTPUT</span>
            {result && (
              <span className={`text-xs ml-auto font-mono ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                exit {result.exitCode} · {result.executionTime}ms
              </span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-2 font-mono text-xs">
            {!result && !running && (
              <span className="text-white/20">Press Run or Ctrl+Enter to execute...</span>
            )}
            {running && (
              <span className="text-cyan-400 animate-pulse">Executing...</span>
            )}
            {result && (
              <>
                {result.stdout && (
                  <pre className="text-green-300 whitespace-pre-wrap">{result.stdout}</pre>
                )}
                {result.stderr && (
                  <pre className="text-red-400 whitespace-pre-wrap">{result.stderr}</pre>
                )}
                {!result.stdout && !result.stderr && (
                  <span className="text-white/30">(no output)</span>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
