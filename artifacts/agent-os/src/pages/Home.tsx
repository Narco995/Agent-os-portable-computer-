import React, { useEffect, useState, useRef } from 'react';
import { Desktop } from '@/components/os/Desktop';
import { useWebSocket } from '@/hooks/use-websocket';

const LOGO = `
 █████╗  ██████╗ ███████╗███╗   ██╗████████╗     ██████╗ ███████╗
██╔══██╗██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝    ██╔═══██╗██╔════╝
███████║██║  ███╗█████╗  ██╔██╗ ██║   ██║       ██║   ██║███████╗
██╔══██║██║   ██║██╔══╝  ██║╚██╗██║   ██║       ██║   ██║╚════██║
██║  ██║╚██████╔╝███████╗██║ ╚████║   ██║       ╚██████╔╝███████║
╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝        ╚═════╝ ╚══════╝`;

const SUBTITLE = 'PORTABLE AI VIRTUAL COMPUTER  ·  v2.0.0  ·  NEURAL ARCHITECTURE';

interface BootLine {
  text: string;
  status?: 'OK' | 'WARN' | 'FAIL' | 'INFO' | null;
  delay: number;
}

const SEQUENCE: BootLine[] = [
  { text: 'BIOS v2.0 — AgentOS Firmware Corporation',                  status: null,   delay: 0    },
  { text: 'CPU: Neural Processing Unit x8 cores @ 4.2GHz',            status: null,   delay: 120  },
  { text: 'RAM: 64GB DDR5 QUANTUM MEMORY',                            status: null,   delay: 200  },
  { text: '',                                                          status: null,   delay: 280  },
  { text: 'Initializing boot sequence...',                            status: null,   delay: 360  },
  { text: 'Loading kernel modules',                                   status: 'OK',   delay: 480  },
  { text: 'Mounting virtual filesystem (VFS)',                        status: 'OK',   delay: 600  },
  { text: 'Establishing quantum neural network link',                 status: 'OK',   delay: 750  },
  { text: 'Starting agent orchestration daemon',                      status: 'OK',   delay: 900  },
  { text: 'Initializing multi-agent router',                          status: 'OK',   delay: 1050 },
  { text: 'Loading AI memory subsystem',                              status: 'OK',   delay: 1200 },
  { text: 'Connecting to OpenAI inference cluster',                   status: 'OK',   delay: 1350 },
  { text: 'Spawning code execution sandbox (JS/Python/Bash)',         status: 'OK',   delay: 1500 },
  { text: 'Starting REST API server on :8080',                        status: 'OK',   delay: 1650 },
  { text: 'Opening WebSocket broker on /api/ws',                     status: 'OK',   delay: 1800 },
  { text: 'Checking GPU acceleration',                               status: 'WARN',  delay: 1950 },
  { text: 'Warming up cyberpunk display driver',                      status: 'OK',   delay: 2100 },
  { text: '',                                                          status: null,   delay: 2200 },
  { text: 'ALL SYSTEMS NOMINAL — BOOTING DESKTOP ENVIRONMENT',        status: 'INFO', delay: 2350 },
];

export default function Home() {
  const { isConnected } = useWebSocket();
  const [phase, setPhase] = useState<'logo' | 'boot' | 'flash' | 'desktop'>('logo');
  const [visibleLines, setVisibleLines] = useState<number>(0);
  const [progressPct, setProgressPct] = useState(0);
  const [scanY, setScanY] = useState(0);

  useEffect(() => {
    // Phase 1: Show logo for 1s
    const t1 = setTimeout(() => setPhase('boot'), 900);
    return () => clearTimeout(t1);
  }, []);

  useEffect(() => {
    if (phase !== 'boot') return;

    const timers: ReturnType<typeof setTimeout>[] = [];

    SEQUENCE.forEach((_, i) => {
      timers.push(setTimeout(() => {
        setVisibleLines(i + 1);
        setProgressPct(Math.round(((i + 1) / SEQUENCE.length) * 100));
      }, SEQUENCE[i].delay));
    });

    const lastDelay = SEQUENCE[SEQUENCE.length - 1].delay;
    timers.push(setTimeout(() => setPhase('flash'), lastDelay + 400));
    timers.push(setTimeout(() => setPhase('desktop'), lastDelay + 900));

    return () => timers.forEach(clearTimeout);
  }, [phase]);

  // Scan line animation during boot
  useEffect(() => {
    if (phase !== 'boot') return;
    const raf = setInterval(() => setScanY(y => (y + 1.5) % 110), 16);
    return () => clearInterval(raf);
  }, [phase]);

  if (phase === 'logo') {
    return (
      <div className="h-screen w-screen bg-black flex flex-col items-center justify-center overflow-hidden">
        <pre
          className="text-xs leading-tight font-mono animate-neon-pulse select-none"
          style={{ color: 'var(--neon-cyan)', fontSize: 'clamp(5px, 0.9vw, 11px)', lineHeight: 1.15 }}
        >
          {LOGO}
        </pre>
        <p className="mt-4 text-[10px] font-mono tracking-[0.25em] animate-pulse" style={{ color: 'var(--neon-cyan)', opacity: 0.6 }}>
          {SUBTITLE}
        </p>
      </div>
    );
  }

  if (phase === 'flash') {
    return <div className="h-screen w-screen bg-white animate-pulse" />;
  }

  if (phase === 'desktop') {
    return (
      <>
        <Desktop />
        <div className="absolute top-3 right-3 z-[9999] flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur border border-white/10 text-[10px] font-mono pointer-events-none">
          <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'pulse-dot-green' : 'pulse-dot-red'} animate-pulse`} />
          <span className={isConnected ? 'text-green-400' : 'text-red-400'}>
            {isConnected ? 'WS ONLINE' : 'WS OFFLINE'}
          </span>
        </div>
      </>
    );
  }

  // Boot sequence screen
  return (
    <div className="h-screen w-screen bg-black font-mono overflow-hidden relative flex flex-col">
      {/* Moving scan line */}
      <div
        className="absolute left-0 right-0 h-32 pointer-events-none z-10"
        style={{
          top: `${scanY}%`,
          background: 'linear-gradient(to bottom, transparent, rgba(0,212,255,0.04), rgba(0,212,255,0.08), rgba(0,212,255,0.04), transparent)',
        }}
      />

      {/* CRT overlay */}
      <div className="absolute inset-0 z-10 crt-overlay pointer-events-none opacity-40" />

      {/* Header */}
      <div className="flex items-center justify-between px-8 pt-6 pb-2 border-b border-cyan-500/10">
        <div>
          <div className="text-xs text-cyan-500/60 tracking-[0.3em] uppercase mb-0.5">AgentOS Bootloader v2.0</div>
          <pre
            className="text-cyan-400 font-mono select-none"
            style={{ fontSize: 'clamp(4px, 0.7vw, 8px)', lineHeight: 1.1, textShadow: '0 0 8px #00d4ff66' }}
          >
            {LOGO.trim().split('\n').slice(0, 2).join('\n')}
          </pre>
        </div>
        <div className="text-right">
          <div className="text-xs text-cyan-500/40 font-mono">SYS BOOT</div>
          <div className="text-2xl font-mono text-cyan-400" style={{ textShadow: '0 0 12px #00d4ff' }}>
            {progressPct.toString().padStart(3, '0')}%
          </div>
        </div>
      </div>

      {/* Boot log */}
      <div className="flex-1 overflow-hidden px-8 py-4">
        <div className="space-y-1">
          {SEQUENCE.slice(0, visibleLines).map((line, i) => (
            <div key={i} className="animate-boot-line flex items-center gap-3 text-xs leading-relaxed">
              {line.text === '' ? (
                <span>&nbsp;</span>
              ) : (
                <>
                  <span
                    className="font-mono"
                    style={{
                      color: line.status === 'INFO' ? 'var(--neon-cyan)'
                           : line.status === 'WARN' ? 'var(--neon-orange)'
                           : line.status === 'FAIL' ? 'var(--neon-pink)'
                           : 'rgba(255,255,255,0.5)',
                    }}
                  >
                    {line.status === null ? '  ' : '[ '}
                  </span>
                  <span
                    className="flex-1 font-mono"
                    style={{
                      color: line.status === 'INFO'   ? 'var(--neon-cyan)'
                           : line.status === 'WARN'   ? 'var(--neon-orange)'
                           : line.status === 'FAIL'   ? 'var(--neon-pink)'
                           : 'rgba(255,255,255,0.72)',
                    }}
                  >
                    {line.text}
                  </span>
                  {line.status && (
                    <span
                      className="font-bold text-[10px] tracking-widest px-2"
                      style={{
                        color: line.status === 'OK'   ? 'var(--neon-green)'
                             : line.status === 'WARN' ? 'var(--neon-orange)'
                             : line.status === 'FAIL' ? 'var(--neon-pink)'
                             : 'var(--neon-cyan)',
                        textShadow: line.status === 'OK'   ? '0 0 8px var(--neon-green)'
                                  : line.status === 'WARN' ? '0 0 8px var(--neon-orange)'
                                  : line.status === 'INFO' ? '0 0 8px var(--neon-cyan)'
                                  : '0 0 8px var(--neon-pink)',
                      }}
                    >
                      {line.status} ]
                    </span>
                  )}
                </>
              )}
            </div>
          ))}

          {visibleLines < SEQUENCE.length && (
            <div className="flex items-center gap-2 text-xs text-white/30 mt-1">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="animate-pulse">_</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-8 pb-8">
        <div className="flex items-center justify-between text-[10px] font-mono text-white/30 mb-1.5">
          <span>SYSTEM INITIALIZATION</span>
          <span>{progressPct}%</span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/10">
          <div
            className="h-full rounded-full transition-all duration-200"
            style={{
              width: `${progressPct}%`,
              background: 'linear-gradient(90deg, var(--neon-cyan), var(--neon-purple))',
              boxShadow: '0 0 8px var(--neon-cyan)',
            }}
          />
        </div>
        <div className="flex items-center justify-between mt-2 text-[9px] font-mono text-white/20">
          <span>AGENT OS PORTABLE COMPUTER</span>
          <span>AI NEURAL ARCHITECTURE v2.0</span>
        </div>
      </div>
    </div>
  );
}
