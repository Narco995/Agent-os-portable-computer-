import React, { useState, useEffect } from 'react';
import {
  Settings, Cpu, MemoryStick, Globe, Code2, Bot, Brain, Folder,
  Wifi, Shield, Info, Terminal, Activity, Zap, GitBranch, Key,
} from 'lucide-react';

const BASE = import.meta.env.BASE_URL;
const API  = `${BASE}api`;

interface SystemState {
  cpu: number; memory: number; totalMemoryGB: number; usedMemoryGB: number;
  uptime: number; platform: string; arch: string; hostname: string;
  nodeVersion: string; cpuModel: string; cpuCores: number; cpuSpeedMHz: number;
  loadAverage: number[]; connectedAgents: number; totalCommands: number;
  process: { pid: number; rssKB: number; heapUsedKB: number; heapTotalKB: number };
  networkInterfaces: { interface: string; address: string; mac: string }[];
}

const API_DOCS = [
  { method: 'GET',    path: '/api/healthz',                    desc: 'Health check'                      },
  { method: 'GET',    path: '/api/system/state',               desc: 'Real-time system metrics'          },
  { method: 'GET',    path: '/api/agents',                     desc: 'List registered agents'            },
  { method: 'POST',   path: '/api/agents',                     desc: 'Register new AI agent'             },
  { method: 'DELETE', path: '/api/agents/:id',                 desc: 'Unregister agent'                  },
  { method: 'GET',    path: '/api/commands',                   desc: 'Command history'                   },
  { method: 'POST',   path: '/api/commands',                   desc: 'Execute computer-use command'      },
  { method: 'POST',   path: '/api/code/run',                   desc: 'Execute JS/Python/Bash code'       },
  { method: 'GET',    path: '/api/files',                      desc: 'Virtual filesystem list'           },
  { method: 'POST',   path: '/api/files',                      desc: 'Create file or directory'          },
  { method: 'GET',    path: '/api/memory',                     desc: 'Agent memory list'                 },
  { method: 'POST',   path: '/api/memory',                     desc: 'Store memory record'               },
  { method: 'GET',    path: '/api/openai/conversations',       desc: 'AI conversations'                  },
  { method: 'POST',   path: '/api/openai/conversations/:id/messages', desc: 'Chat (SSE streaming)' },
  { method: 'WS',     path: '/api/ws',                        desc: 'Real-time WebSocket broker'        },
];

const METHOD_COLORS: Record<string, string> = {
  GET:    'text-green-400 bg-green-500/10 border-green-500/20',
  POST:   'text-cyan-400  bg-cyan-500/10  border-cyan-500/20',
  DELETE: 'text-red-400   bg-red-500/10   border-red-500/20',
  PUT:    'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  WS:     'text-purple-400 bg-purple-500/10 border-purple-500/20',
};

type TabId = 'system' | 'api' | 'about';

function StatCard({ label, value, unit = '', color = 'cyan' }: { label: string; value: string | number; unit?: string; color?: string }) {
  const c = { cyan: 'var(--neon-cyan)', green: 'var(--neon-green)', purple: 'var(--neon-purple)', orange: 'var(--neon-orange)' }[color] ?? 'var(--neon-cyan)';
  return (
    <div className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</div>
      <div className="text-lg font-mono font-bold" style={{ color: c, textShadow: `0 0 10px ${c}66` }}>
        {value}<span className="text-xs font-normal ml-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{unit}</span>
      </div>
    </div>
  );
}

export function SettingsApp() {
  const [tab, setTab] = useState<TabId>('system');
  const [sysState, setSysState] = useState<SystemState | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tab === 'system') loadSystem();
    const iv = tab === 'system' ? setInterval(loadSystem, 3000) : null;
    return () => { if (iv) clearInterval(iv); };
  }, [tab]);

  async function loadSystem() {
    setLoading(true);
    try {
      const r = await fetch(`${API}/system/state`);
      setSysState(await r.json());
    } catch { /* ignore */ }
    setLoading(false);
  }

  function formatUptime(s: number) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h}h ${m}m ${sec}s`;
  }

  const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'system', label: 'System',    icon: Activity },
    { id: 'api',    label: 'API Docs',  icon: Code2    },
    { id: 'about',  label: 'About',     icon: Info     },
  ];

  return (
    <div className="h-full flex flex-col" style={{ background: '#080810', color: '#e0e0e0' }}>
      {/* Tab bar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b" style={{ borderColor: 'rgba(0,212,255,0.1)', background: 'rgba(0,0,0,0.3)' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
            style={{
              background: tab === t.id ? 'rgba(0,212,255,0.12)' : 'transparent',
              border: `1px solid ${tab === t.id ? 'rgba(0,212,255,0.25)' : 'transparent'}`,
              color: tab === t.id ? 'var(--neon-cyan)' : 'rgba(255,255,255,0.45)',
            }}
          >
            <t.icon size={12} />
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">

        {/* ── System tab ── */}
        {tab === 'system' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Real-Time Metrics</h3>
              {loading && <div className="w-3 h-3 rounded-full border border-cyan-400 border-t-transparent animate-spin" />}
            </div>

            {sysState ? (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <StatCard label="CPU Usage"  value={sysState.cpu}     unit="%"   color="cyan"   />
                  <StatCard label="Memory"     value={sysState.memory}  unit="%"   color="purple" />
                  <StatCard label="Uptime"     value={formatUptime(sysState.uptime)} color="green" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <StatCard label="RAM Used"   value={sysState.usedMemoryGB}  unit=" GB"  color="orange" />
                  <StatCard label="RAM Total"  value={sysState.totalMemoryGB} unit=" GB"  color="cyan"   />
                </div>

                <div className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                  {[
                    { icon: Cpu,      label: 'CPU Model',     value: `${sysState.cpuModel} × ${sysState.cpuCores} cores` },
                    { icon: Zap,      label: 'CPU Speed',     value: `${sysState.cpuSpeedMHz} MHz` },
                    { icon: Activity, label: 'Load Average',  value: sysState.loadAverage?.join(' / ') ?? '-' },
                    { icon: Globe,    label: 'Hostname',      value: sysState.hostname },
                    { icon: Settings, label: 'Platform',      value: `${sysState.platform} (${sysState.arch})` },
                    { icon: Terminal, label: 'Node.js',       value: sysState.nodeVersion },
                    { icon: Brain,    label: 'PID',           value: String(sysState.process?.pid ?? '-') },
                    { icon: Bot,      label: 'Agents',        value: String(sysState.connectedAgents) },
                    { icon: Code2,    label: 'Commands run',  value: String(sysState.totalCommands) },
                  ].map((row, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2" style={{ background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <row.icon size={12} style={{ color: 'rgba(0,212,255,0.5)', flexShrink: 0 }} />
                      <span className="text-xs w-28 shrink-0" style={{ color: 'rgba(255,255,255,0.4)' }}>{row.label}</span>
                      <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.85)' }}>{row.value}</span>
                    </div>
                  ))}
                </div>

                {sysState.networkInterfaces?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-2">Network Interfaces</h4>
                    {sysState.networkInterfaces.map((n, i) => (
                      <div key={i} className="flex items-center gap-3 text-xs px-3 py-1.5 rounded mb-1" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <Wifi size={11} style={{ color: 'var(--neon-green)' }} />
                        <span className="w-20 font-mono" style={{ color: 'rgba(255,255,255,0.5)' }}>{n.interface}</span>
                        <span className="font-mono" style={{ color: 'var(--neon-cyan)' }}>{n.address}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-sm" style={{ color: 'rgba(255,255,255,0.25)' }}>Loading system data...</div>
            )}
          </div>
        )}

        {/* ── API Docs tab ── */}
        {tab === 'api' && (
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-white mb-1">REST API Reference</h3>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                All endpoints are prefixed with <code className="text-green-400 bg-black/40 px-1 rounded">/api</code>. Base URL is your deployment domain.
              </p>
            </div>

            <div className="space-y-1">
              {API_DOCS.map((ep, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border font-mono ${METHOD_COLORS[ep.method]}`}>
                    {ep.method}
                  </span>
                  <code className="font-mono flex-1 min-w-0 truncate" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '10px' }}>{ep.path}</code>
                  <span className="text-[10px] shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }}>{ep.desc}</span>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-lg mt-4" style={{ background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.15)' }}>
              <div className="text-xs font-semibold mb-2" style={{ color: 'var(--neon-cyan)' }}>WebSocket Connection</div>
              <code className="text-xs font-mono block" style={{ color: 'rgba(255,255,255,0.7)' }}>
                ws://&lt;host&gt;/api/ws
              </code>
              <p className="text-[10px] mt-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Real-time events: agent connects/disconnects, commands, system alerts.
              </p>
            </div>
          </div>
        )}

        {/* ── About tab ── */}
        {tab === 'about' && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3"
                style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(168,85,247,0.15))', border: '1px solid rgba(0,212,255,0.2)' }}
              >
                <Terminal size={28} style={{ color: 'var(--neon-cyan)' }} />
              </div>
              <h2 className="text-lg font-bold text-white">Agent OS</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--neon-cyan)' }}>Portable AI Virtual Computer</p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono" style={{ background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.2)', color: 'var(--neon-green)' }}>
                  v2.0.0
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono" style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', color: 'var(--neon-cyan)' }}>
                  Neural Arch
                </span>
              </div>
            </div>

            {[
              { icon: Bot,       label: 'AI Engine',        value: 'GPT-5.2 via Replit AI Proxy · Streaming SSE' },
              { icon: Code2,     label: 'Code Execution',   value: 'JavaScript · Python · Bash · TypeScript' },
              { icon: Brain,     label: 'Memory System',    value: 'Episodic · Semantic · Procedural · Notes' },
              { icon: Folder,    label: 'Virtual FS',       value: 'PostgreSQL-backed file/directory tree' },
              { icon: Wifi,      label: 'Realtime',         value: 'WebSocket broker + REST API + SSE streaming' },
              { icon: GitBranch, label: 'Multi-Agent',      value: 'Register · dispatch · orchestrate AI agents' },
              { icon: Shield,    label: 'Architecture',     value: 'React + Vite + Express + Drizzle + PostgreSQL' },
              { icon: Key,       label: 'Auth',             value: 'API-key ready · WebSocket token support' },
            ].map((row, i) => (
              <div key={i} className="flex gap-3 items-start px-3 py-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <row.icon size={14} style={{ color: 'var(--neon-cyan)', marginTop: 1, flexShrink: 0 }} />
                <div>
                  <div className="text-xs font-semibold text-white">{row.label}</div>
                  <div className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>{row.value}</div>
                </div>
              </div>
            ))}

            <div className="text-center text-[9px] mt-4" style={{ color: 'rgba(255,255,255,0.2)' }}>
              Built with maximum engineering potential · No competition
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
